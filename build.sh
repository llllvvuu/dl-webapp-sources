#!/bin/sh

rimraf dist

tsc -p tsconfig.esm.json
tsc -p tsconfig.cjs.json

for file in dist/esm/*.d.ts*; do
  # sus
  sed -e 's/\.d\.ts/.d.mts/g' "$file" > "$file.bak"
  mv -- "$file.bak" "$file"
done
for file in dist/esm/*.js*; do
  # sus
  sed -e 's/\.js/.mjs/g' "$file" > "$file.bak"
  mv -- "$file.bak" "$file"
done
for file in dist/esm/*.js; do mv -- "$file" "${file%.js}.mjs"; done
for file in dist/esm/*.js.map; do mv -- "$file" "${file%.js.map}.mjs.map"; done
for file in dist/esm/*.ts; do mv -- "$file" "${file%.ts}.mts"; done
for file in dist/esm/*.ts.map; do mv -- "$file" "${file%.ts.map}.mts.map"; done

api-extractor run --local
api-documenter markdown
