class VernalApplication {

  instances = {};
  autowires = [];
  exposed = [];

  registerComponent(component: any) {
    this.instances[component.name] = new component();
  }

  registerComponentInstance(instance: Object) {
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
        target,
        propertyKey,
        componentName,
      });
    };
  }

  exportedMethods = {};

  getExportedMethods() {
    return {...this.exportedMethods};
  }

  exportComponent(component: any) {
    const props = Object.getOwnPropertyNames(component.prototype);
    for(const prop of props) {
      if(prop !== 'constructor' && typeof component.prototype[prop] === 'function') {
        this.exposed.push({
          name: `${component.name}.${prop}`,
          func: component.prototype[prop],
          componentName: component.name,
        });
      }
    }
  }

  run() {
    // Inject dependencies
    for (const {
      target,
      propertyKey,
      componentName,
    } of this.autowires) {
      if (!{}.hasOwnProperty.call(this.instances, componentName)) {
        throw new Error(`Could not find component '${componentName}' in context while trying to inject into '${target.constructor.name}.${propertyKey}'`);
      }
      Object.defineProperty(target, propertyKey, {
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
    // Extract exports
    for (const {
      name,
      func,
      componentName,
    } of this.exposed) {
      if (!{}.hasOwnProperty.call(this.instances, componentName)) {
        throw new Error(`Could not find component '${componentName}' in context while trying to bind exported method '${name}'`);
      }
      this.exportedMethods[name] = func.bind(this.instances[componentName]);
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

export function Export(component: any) {
  return Vernal.exportComponent(component);
}
