import { isSnakeCase } from "../utils/isSnakeCase";
import { version } from "../utils/version";
import { Parser } from "./parser";
import { Resolver } from "./resolver";
import { Tokenizer } from "./tokenizer";

export class Generator {
    constructor(public readonly schema: string) {}

    public generate() {
        const tokens = new Tokenizer(this.schema).tokenize();

        const structs = new Parser(tokens).parse();

        const resolver = new Resolver(structs);

        const resolved = resolver.resolve();

        return [
            `\
/**
 * typegc - Type Guard Compiler
 * 
 * version ${version()}
 * 
 * AUTO-GENERATED FILE DO NOT EDIT DIRECTLY
 */

/**
 * config
${JSON.stringify(Object.fromEntries([...resolved.config.entries()]), undefined, 4)
    .split("\n")
    .map((line) => ` * ${line}`)
    .join("\n")}
 */

/**
 * globals
 */
var _;${[...new Set(resolved.globals.split("\n"))].join("\n")}

/**
 * aliases
 */
var _;
${[...resolved.aliases.entries()]
    .map(
        ([name, alias]) => `\
/**
${
    alias[0].comments
        ?.split("\n")
        .map((line) => ` * ${line}`)
        .join("\n") || ` *`
}
 */
const ${name} = [${alias.map((fn) => resolver.gen(name, fn)).join(", ")}];`
    )
    .join("\n")}

/**
 * definitions
 */
var _;
${[...resolved.defs.entries()]
    .map(
        ([name, def]) => `\
/**
${
    def.comments
        .split("\n")
        .map((line) => ` * ${line}`)
        .join("\n") || ` *`
}
 */
const ${name} = ${def.js};
`
    )
    .join("\n")}
/**
 * models
 */
var _;
${[...resolved.models.entries()]
    .map(
        ([name, model]) => `\
/**
${
    model.comments
        .split("\n")
        .map((line) => ` * ${line}`)
        .join("\n") || ` *`
}
 */
export const is${isSnakeCase(name) ? "_" : ""}${name} = ${model.js};
`
    )
    .join("\n")}
`,
            `\
/**
 * typegc - Type Guard Compiler
 * 
 * version ${version()}
 * 
 * AUTO-GENERATED FILE DO NOT EDIT DIRECTLY
 */

/**
 * config
${JSON.stringify(Object.fromEntries([...resolved.config.entries()]), undefined, 4)
    .split("\n")
    .map((line) => ` * ${line}`)
    .join("\n")}
 */

/**
 * type aliases
 */
declare var _: never;
${[...resolved.aliases.entries()]
    .map(([name, alias]) =>
        Resolver.builtins.primitives.has(name)
            ? ""
            : `\
type ${name} = ${[...new Set(alias.flatMap((fn) => fn.ts.split(" | ")))].join(" | ")};\
`
    )
    .join("\n")}

/**
 * interfaces
 */
 declare var _: never;
${[...resolved.defs.entries()]
    .map(
        ([name, model]) => `\
interface ${name} {
${model.properties.map(([prop, type]) => `    ${prop}: ${type};`).join("\n")}
}`
    )
    .join("\n")}

/**
 * exported interfaces
 */
declare var _: never;
${[...resolved.models.entries()]
    .map(
        ([name, model]) => `\
export interface ${name} {
${model.properties.map(([prop, type]) => `    ${prop}: ${type};`).join("\n")}
}`
    )
    .join("\n")}

/**
 * type guards
 */
declare var _: never;
${[...resolved.models.entries()]
    .map(
        ([name, model]) => `\
export declare const is${isSnakeCase(name) ? "_" : ""}${name}: (v: unknown) => v is ${name};
`
    )
    .join("\n")}
`,
        ] as [js: string, dts: string];
    }
}
