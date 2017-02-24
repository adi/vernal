export interface VernalPlugin {
  run(): Promise<any>;
}

export enum ComponentType {
  SINGLETON,
  PROTOTYPE,
}

export class VernalError extends Error {
  constructor(message, public cause?: Error) {
    super(message);
  }
}

export class VernalRunError extends VernalError {
}

export class VernalInitError extends VernalError {
}

export class VernalGetComponentError extends VernalError {
}

export class VernalInvalidComponentTypeError extends VernalError {
}

export class VernalInjectComponentError extends VernalError {
}

export class VernalPossibleDependencyCycleError extends VernalError {
}

export class VernalPluginError extends VernalError {
}

class VernalApplication {

  private components = {};
  private autowires = [];
  private plugins: VernalPlugin[] = [];

  registerPlugin(plugin: VernalPlugin) {
    this.plugins.push(plugin);
  }

  hasComponent(componentName: string) {
    return {}.hasOwnProperty.call(this.components, componentName);
  }

  async callInitIfAvailable(instance) {
    try {
      if (instance.prototype !== undefined) {
        if (typeof instance.prototype.init === 'function') {
          return instance.prototype.init.bind(instance)();
        }
      } else {
        if (typeof instance.init === 'function') {
          return instance.init();
        }
      }
    } catch (e) {
      throw new VernalInitError(`Error calling while calling ${instance.constructor.name}.init`, e);
    }
  }

  async getComponent(componentName: string) {
    try {
      const component = this.components[componentName];
      if (component === undefined) {
        throw new VernalGetComponentError(`Component '${componentName}' not found`);
      }
      switch (component.type) {
        case ComponentType.SINGLETON:
          return component.data;
        case ComponentType.PROTOTYPE:
          const componentClass = component.data;
          const newInstance = new componentClass();
          // Inject dependencies
          for (const {
            targetName,
            propertyKey,
            componentName,
          } of this.autowires.filter(item => item.targetName === componentName)) {
            if (!this.hasComponent(componentName)) {
              throw new VernalInjectComponentError(`Could not find component '${componentName}' in context while trying to inject into '${targetName}.${propertyKey}'`);
            }
            const component = await this.getComponent(componentName);
            Object.defineProperty(newInstance, propertyKey, {
              value: component,
              writable: false,
              configurable: false,
            });
          }
          // Run init (if defined)
          await this.callInitIfAvailable(newInstance);
          return newInstance;
        default:
          throw new VernalInvalidComponentTypeError(`Component '${componentName}' has invalid type '${component.type}'`);
      }
    } catch (e) {
      throw new VernalGetComponentError(`Error getting component ${componentName}`, e);
    }
  }

  registerComponent(component: any, type: ComponentType) {
    this.components[component.name] = { type, data: component };
  }

  registerComponentInstance(instance: any) {
    this.components[instance.constructor.name] = { type: ComponentType.SINGLETON, data: instance };
  }

  registerValue(name: string, value: any) {
    this.components[name] = { type: ComponentType.SINGLETON, data: value };
  }

  linkComponent(component: any) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      let componentName: string;
      if (typeof component === 'string') {
        componentName = component;
      } else {
        if (component === undefined) {
          throw new VernalPossibleDependencyCycleError(`Component class for component to be autowired in '${target.constructor.name}.${propertyKey}' not loaded yet (perhaps you have a cycle in your dependencies)`);
        }
        componentName = component.name;
      }
      this.autowires.push({
        targetName: target.constructor.name,
        propertyKey,
        componentName,
      });
      descriptor = { ...descriptor, configurable: true };
      return descriptor;
    };
  }

  async run() {
    try {
      // Inject dependencies
      for (const {
        targetName,
        propertyKey,
        componentName,
      } of this.autowires) {
        if (!this.hasComponent(targetName)) {
          throw new VernalInjectComponentError(`Could not find component '${targetName}' in context while trying to inject into it`);
        }
        if (!this.hasComponent(componentName)) {
          throw new VernalInjectComponentError(`Could not find component '${componentName}' in context while trying to inject into '${targetName}.${propertyKey}'`);
        }
        const target = await this.getComponent(targetName);
        const component = await this.getComponent(componentName);
        Object.defineProperty(target, propertyKey, {
          value: component,
          writable: false,
          configurable: false,
        });
      }
      // Run init (if defined)
      for (const componentName of Object.keys(this.components)) {
        const component = this.components[componentName];
        if (component.type === ComponentType.SINGLETON) {
          await this.callInitIfAvailable(component.data);
        }
      }
      // Run plugins
      for (const plugin of this.plugins) {
        try {
          await plugin.run();
        } catch (e) {
          throw new VernalPluginError(`Plugin error in '${plugin.constructor.name}'`, e);
        }
      }
    } catch (e) {
      throw new VernalRunError('Boot error', e);
    }
  }
}

export const Vernal = new VernalApplication();

export function Component(type = ComponentType.SINGLETON) {
  return (component: any) => {
    return Vernal.registerComponent(component, type);
  }
}

export function Autowire(component: string);
export function Autowire(component: any);

export function Autowire(component: any) {
  return Vernal.linkComponent(component);
}
