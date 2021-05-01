export class D5HDiceExtensions {
  static onInit() {
    Hooks.on("init", () => {
      Die.MODIFIERS.mr = function minResult(modifier) {
        const min = parseInt(modifier.match(/\d+/));
        if (!min || !Number.isNumeric(min)) return;
        this.results = this.results.flatMap((result) => {
          if (result.result < min && result.active) {
            result.active = false;
            result.discarded = true;
            return [result, { result: min, active: true }];
          } else {
            return [result];
          }
        });
      };
    });
  }
}
