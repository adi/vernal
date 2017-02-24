import { Vernal, VernalPlugin } from "./Vernal";

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
    // Extract exports
    for (const {
      name,
      func,
      componentName,
    } of this.exposed) {
      if (!Vernal.hasComponent(componentName)) {
        throw new Error(`Could not find component '${componentName}' in context while trying to bind exported method '${name}'`);
      }
      this.exposedMethods[name] = func.bind(Vernal.getComponent(componentName));
    }
  }

}

export const Exposed = new ExposedContext();
Vernal.registerPlugin(Exposed);

export function Expose(component: any) {
  return Exposed.exposeComponent(component);
}
