export interface VernalPlugin {
  run(): Promise<any>;
}

class VernalApplication {

  private instances = {};
  private autowires = [];
  private plugins: VernalPlugin[] = [];

  registerPlugin(plugin: VernalPlugin) {
    this.plugins.push(plugin);
  }

  hasComponent(componentName: string) {
    return {}.hasOwnProperty.call(this.instances, componentName);
  }

  getComponent(componentName: string) {
    return this.instances[componentName];
  }

  registerComponent(component: any) {
    this.instances[component.name] = new component();
  }

  registerComponentInstance(instance: any) {
    this.instances[instance.constructor.name] = instance;
  }

  registerValue(name: string, value: any) {
    this.instances[name] = value;
  }

  linkComponent(component: any) {
    return (target: any, propertyKey: string) => {
      let componentName: string;
      if (typeof component === 'string') {
        componentName = component;
      } else {
        if (component === undefined) {
          throw new Error(`Component class for component to be autowired in '${target.constructor.name}.${propertyKey}' not loaded yet (perhaps you have a cycle in your dependencies)`);
        }
        componentName = component.name;
      }
      this.autowires.push({
        targetName: target.constructor.name,
        propertyKey,
        componentName,
      });
    };
  }

  async run() {
    // Inject dependencies
    for (const {
      targetName,
      propertyKey,
      componentName,
    } of this.autowires) {
      if (!{}.hasOwnProperty.call(this.instances, targetName)) {
        throw new Error(`Could not find component '${targetName}' in context while trying to inject it`);
      }
      if (!{}.hasOwnProperty.call(this.instances, componentName)) {
        throw new Error(`Could not find component '${componentName}' in context while trying to inject into '${targetName}.${propertyKey}'`);
      }
      Object.defineProperty(this.instances[targetName], propertyKey, {
        value: this.instances[componentName],
        writable: false,
      });
    }
    // Run init (if defined)
    for (const componentName of Object.keys(this.instances)) {
      if (typeof this.instances[componentName].init === 'function') {
        this.instances[componentName].init();
      }
    }
    // Run plugins
    for (const plugin of this.plugins) {
      await plugin.run();
    }
  }
}

export const Vernal = new VernalApplication();

export function Component(component: any) {
  return Vernal.registerComponent(component);
}

export function Autowire(component: string);
export function Autowire(component: any);

export function Autowire(component: any) {
  return Vernal.linkComponent(component);
}
