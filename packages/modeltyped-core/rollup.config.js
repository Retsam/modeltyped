import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from "typescript";

export default {
    input: 'lib/modeltyped.ts',
    output: {
      file: 'dist/modeltyped.js',
      format: 'cjs'
    },
    external: ["lodash.assign"],
    plugins: [ typescriptPlugin({
        typescript: typescript,
        tsconfigOverride: {
          compilerOptions: {
            module: "esnext"
          }
        }
    }) ],
};
