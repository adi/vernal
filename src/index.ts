import { performInjections } from './annotations/Component';

export class Application {
  run() {
    performInjections();
  }
}
