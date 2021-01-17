export class BaseClass {
  [propName: string]: any

  constructor(args: any) {
    for (const field in args) {
      this[field] = args[field]
    }
  }

  static new(args: any) {
    return new this(args)
  }
}
