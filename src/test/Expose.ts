import { Vernal, VernalPlugin } from "..";

class ExposedContext implements VernalPlugin {

  exposed = [];
  exposedMethods = {};

  getExposedMethods() {
    return {...this.exposedMethods};
  }

  exposeComponent(component: any) {
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

  async run() {
    try {
      for (const {
        name,
        func,
        componentName,
      } of this.exposed) {
        if (!Vernal.hasComponent(componentName)) {
          throw new Error(`Could not find component '${componentName}' in context while trying to bind exported method '${name}'`);
        }
        this.exposedMethods[name] = func.bind(await Vernal.getComponent(componentName));
      }
    } catch (e) {
      throw new Error('Expose error');
    }
  }

}

export const Exposed = new ExposedContext();
Vernal.registerPlugin(Exposed);

export function Expose() {
  return (component: any) => {
    return Exposed.exposeComponent(component);
  }
}
