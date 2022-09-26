/**
 * @class 
 */
export default class HPI {

  static register() {
    HPI.build();
  }

  static build() {
    
    game.modules.get(moduleName).api = new HPI();
  };

  constructor(namespace) {

    const members = Object.create(null);

    members.name = namespace;

    return new Proxy(members, {
      get: (target, name, receiver) => {
        if (!Reflect.has(target, name)) {
          throw new Error(`Member '${String(name)}' not found on the Enum.`);
        }
        return Reflect.get(target, name, receiver);
      },
      set: (/*target, name, value*/) => {
        throw new Error('Adding new members to Enums is not allowed.');
      }
    });
  }

  #apiMap = new Map();


  add(namespace, path, fn) {

    if(namespace in HPI.prototype){
      throw new Error('API namespace is not allowed');
    }

    const apiPartial = foundry.utils.expandObject({[path]:fn});

    if(!this.#apiMap.has(namespace)) {
      this.#apiMap.set(namespace, apiPartial);
    } else {
      foundry.utils.mergeObject(this.#apiMap.get(namespace), apiPartial, {inplace: true});
    }
  }

  addInterface(namespace, cls) {
    if(namespace in HPI.prototype || this.#apiMap.has(namespace)){
      throw new Error('API namespace is not allowed');
    }

    this.#apiMap.set(namespace, cls);
  }

}
