export enum BeanType {
  SINGLETON,
  PROTOTYPE,
  VALUE,
}

export class VernalError extends Error {
  constructor(message, public cause?: Error) {
    super(message);
  }
}

interface Bean {
  instance: Object;
}

interface BeanMap {
  [key: string]: Bean
}

interface BeanDescriptor {
  beanClass: { new (): any };
  beanType: BeanType;
}

interface BeanDescriptorMap {
  [key: string]: BeanDescriptor
}

interface Injection {
  propertyKey: String;
  propertyBeanName: String;
}

const INJECTIONS_PROPERTY = '__injections';
const POST_CONSTRUCT_HOOKS_PROPERTY = '__post_construct_hooks';

class VernalApplication {

  private beans: BeanMap = {};
  private beanDescriptors: BeanDescriptorMap = {};

  registerBean(beanClass: { new (): any }, beanType: BeanType) {
    this.beanDescriptors[beanClass.name] = <BeanDescriptor>{ beanClass, beanType };
    // console.log('registerBean', beanClass.name, beanType);
  }
  registerInstance(beanInstance: Object) {
    const beanClass = beanInstance.constructor;
    const beanName = beanClass.name;
    this.beans[beanName] = <Bean>{ instance: beanInstance };
    this.beanDescriptors[beanName] = <BeanDescriptor>{ beanClass, beanType: BeanType.VALUE };
    // console.log('registerInstance', beanName);
  }
  registerValue(beanName: string, beanValue: any) {
    this.beans[beanName] = <Bean>{ instance: beanValue };
    this.beanDescriptors[beanName] = <BeanDescriptor>{ beanType: BeanType.VALUE };
    // console.log('registerValue', beanName);
  }

  registerInjection(propertyBeanNameOrClass: string | { new (): any }, beanInstance: Object, propertyKey: String, descriptor: PropertyDescriptor) {
    if (propertyBeanNameOrClass === undefined) {
      throw new VernalError(`Component class for component to be injected in '${beanInstance.constructor.name}.${propertyKey}' not loaded yet (perhaps you have a cycle in your dependencies)`);
    }
    let propertyBeanName: string;
    if (typeof propertyBeanNameOrClass === 'string') {
      propertyBeanName = propertyBeanNameOrClass;
    } else {
      propertyBeanName = propertyBeanNameOrClass.name;
    }
    if ({}.hasOwnProperty.call(beanInstance, INJECTIONS_PROPERTY) === false) {
      Object.defineProperty(beanInstance, INJECTIONS_PROPERTY, <TypedPropertyDescriptor<Injection[]>>{
        configurable: false,
        writable: false,
        enumerable: false,
        value: [],
      });
    }
    // console.log('registerInjection', beanInstance.constructor.name, propertyKey, propertyBeanName);
    beanInstance[INJECTIONS_PROPERTY].push(<Injection>{ propertyKey, propertyBeanName });
    descriptor = { ...descriptor, configurable: true };
    return descriptor;
  }
  registerPostConstructHook(beanInstance: Object, hookName: String) {
    if ({}.hasOwnProperty.call(beanInstance, POST_CONSTRUCT_HOOKS_PROPERTY) === false) {
      Object.defineProperty(beanInstance, POST_CONSTRUCT_HOOKS_PROPERTY, <TypedPropertyDescriptor<String[]>>{
        configurable: false,
        writable: false,
        enumerable: false,
        value: [],
      });
    }
    // console.log('registerPostConstructHook', beanInstance.constructor.name, hookName);
    beanInstance[POST_CONSTRUCT_HOOKS_PROPERTY].push(hookName);
  }

  private async injectDependencies(bean: Bean) {
    const beanInstance = bean.instance;
    const injections = beanInstance[INJECTIONS_PROPERTY];
    if (injections !== undefined) {
      for (const { propertyKey, propertyBeanName } of injections) {
        const propertyBeanDescriptor = this.beanDescriptors[propertyBeanName];
        if (propertyBeanDescriptor === undefined) {
          throw new VernalError(`Bean descriptor of class '${propertyBeanName}' could not be found`);
        }
        let propertyBean;
        if (propertyBeanDescriptor.beanType === BeanType.SINGLETON || propertyBeanDescriptor.beanType === BeanType.VALUE) {
          propertyBean = this.beans[propertyBeanName];
          if (propertyBean === undefined) {
            throw new VernalError(`Bean of class '${propertyBeanName}' could not be found`);
          }
        } else if (propertyBeanDescriptor.beanType === BeanType.PROTOTYPE) {
          // Construct bean from prototype
          propertyBean = <Bean>{ instance: new propertyBeanDescriptor.beanClass() };
          // Inject dependencies & run post construct hooks
          await this.injectDependencies(propertyBean);
          await this.runPostConstructHooks(propertyBean);
        } else {
          throw new VernalError(`Unknown bean type '${propertyBeanDescriptor.beanType}'`);
        }
        Object.defineProperty(beanInstance, propertyKey, {
          configurable: false,
          writable: false,
          value: propertyBean,
        });
      }
    }
  }
  private async runPostConstructHooks(bean: Bean) {
    const beanInstance = bean.instance;
    const postConstructHooks = beanInstance[POST_CONSTRUCT_HOOKS_PROPERTY];
    if (postConstructHooks !== undefined) {
      for (const hookName of postConstructHooks) {
        const postConstructHook = beanInstance[hookName].bind(beanInstance);
        await postConstructHook();
      }
    }
  }

  async run() {
    try {
      // Construct all the singletons
      for (const beanName of Object.keys(this.beanDescriptors)) {
        const { beanClass, beanType } = this.beanDescriptors[beanName];
        if (beanType === BeanType.SINGLETON) {
          if ({}.hasOwnProperty.call(this.beans, beanName)) {
            throw new VernalError(`Singleton bean of class '${beanName}' already exists`);
          }
          this.beans[beanName] = <Bean>{ instance: new beanClass() };
        }
      }
      // Inject dependencies & run post construct hooks
      for (const beanName of Object.keys(this.beans)) {
        const bean = this.beans[beanName];
        await this.injectDependencies(bean);
        await this.runPostConstructHooks(bean);
      }
    } catch (e) {
      throw new VernalError('Boot error', e);
    }
  }
}

export const Vernal = new VernalApplication();

export function Component(beanType = BeanType.SINGLETON) {
  return (beanClass: { new (): any }) => {
    return Vernal.registerBean(beanClass, beanType);
  }
}

export function Singleton(beanClass: { new (): any }) {
  return Component(BeanType.SINGLETON)(beanClass);
}

export function Prototype(beanClass: { new (): any }) {
  return Component(BeanType.PROTOTYPE)(beanClass);
}

export function Inject(beanName: string);
export function Inject(beanClass: { new (): any });
export function Inject(propertyBeanNameOrClass: string | { new (): any }) {
  return (beanInstance: Object, propertyKey: String, descriptor: PropertyDescriptor) => {
    return Vernal.registerInjection(propertyBeanNameOrClass, beanInstance, propertyKey, descriptor);
  }
}

export const Autowire = Inject;

export function PostConstruct(beanInstance: Object, hookName: String) {
  return Vernal.registerPostConstructHook(beanInstance, hookName);
}
