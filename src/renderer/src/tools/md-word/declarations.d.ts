// mammoth 与 turndown-plugin-gfm 无自带类型,也无 @types 包
// (已核:npm registry 无 @types/mammoth、@types/turndown-plugin-gfm)。
// 声明为 any,页面/transform 中以鸭子类型使用;turndown 本体类型由 @types/turndown 提供。
declare module 'mammoth'
declare module 'turndown-plugin-gfm'
