import{c as e,f as t,h as n,l as r,n as i,s as a,t as o,u as s}from"./QOsIX-IB.js";var c=`fuzdev`,l=[{name:`fuz_template`,repos:[`fuz_template`]},{name:`zzz`,repos:[`zzz`]},{name:`zervo`,repos:[`zervo`]},{name:`fuz_forge`,repos:[`fuz_forge`]},{name:`fuz_app`,repos:[`fuz_app`]},{name:`fuz`,repos:[`fuz`]},{name:`fuz_css`,repos:[`fuz_css`]},{name:`fuz_ui`,repos:[`fuz_ui`]},{name:`fuz_code`,repos:[`fuz_code`]},{name:`mdz`,repos:[`mdz`]},{name:`fuz_blog`,repos:[`fuz_blog`]},{name:`gro`,repos:[`gro`]},{name:`tsv`,repos:[`tsv`,`tsv.fuz.dev`],packages:[`@fuzdev/tsv`,`@fuzdev/tsv-wasm`,`@fuzdev/tsv-format-wasm`,`@fuzdev/tsv-parse-wasm`]},{name:`tsv-format`,repos:[`vscode-extension-tsv-format`]},{name:`svelte-docinfo`,repos:[`svelte-docinfo`]},{name:`fuz_repos`,repos:[`fuz_repos`]},{name:`fuz-stack`,repos:[`docs.fuz.dev`],routes:[`/skills`]},{name:`corpora`,repos:[`corpora`]},{name:`fuz_util`,repos:[`fuz_util`]},{name:`fuz_schema`,repos:[`fuz_schema`]},{name:`blake3`,repos:[`blake3`],packages:[`@fuzdev/blake3-wasm`]},{name:`zap`,repos:[`zap`]},{name:`pglet`,repos:[`pglet`],packages:[`@fuzdev/pglet-wasm`]}];l.map(e=>e.name),new Set(l.flatMap(e=>e.repos));var u=[`runtime`,`peer`,`peer_optional`,`optional`,`build`,`dev`],d=r(u),f={runtime:{label:`runtime`,meaning:`Under dependencies in package.json, or a normal dependency of a crate.`},peer:{label:`peer`,meaning:`Under peerDependencies, and required.`},peer_optional:{label:`optional peer`,meaning:`Under peerDependencies, and marked optional.`},optional:{label:`optional`,meaning:`Under optionalDependencies.`},build:{label:`build`,meaning:`A crate's build dependency.`},dev:{label:`dev`,meaning:`Under devDependencies, a dev dependency of a crate, or anything a test or tooling crate uses.`}},p=new Set([`build`,`dev`]),m=e({from:n,from_repo:n,to:n,manifest:r([`npm`,`cargo`]),kind:d,source:s(r([`path`,`registry`])),via:o(n)}),h=e({file:n,runs:o(n)}),g=e({repo:n,project:n,npm:i,cargo:i,check_script:a(n),workflows:o(h)}),_=e({checked:n,repos:o(g),edges:o(m)}),v={consumers:`The stack repos that declare a dependency on it. A breaking change has to be carried through each of them, and through any consumer that no manifest declares.`,declares:`Only each repo's root manifests are read. A manifest shows what a repo declares, which is not always what its code imports, and a dependency that no manifest states, such as a sibling checkout a test reads, is not here.`,stack_only:`Only the stack's own projects are listed, so a consumer outside the stack is not here.`,tables:`The kind is the manifest table a dependency is declared in, not how much it matters: an app that bundles what it builds declares everything as dev.`,commands:`The commands are each workflow's run steps as the file writes them, without the actions a step uses or the conditions on it, and nothing here says which command is the gate.`},y=e=>p.has(e.kind),b=(e,t)=>[...new Set(e.map(e=>e[t]))],x=t(_,{checked:`2026-11-19`,repos:[{repo:`fuz_template`,project:`fuz_template`,npm:!0,cargo:!0,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`cargo fmt --check`,`cargo clippy --locked --workspace --all-targets -- -D warnings`,`cargo test --locked --workspace`,`cargo doc --locked --workspace --no-deps`]}]},{repo:`zzz`,project:`zzz`,npm:!0,cargo:!0,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`cp .env.development.example .env.development`,`cp .env.production.example .env.production`,`npx svelte-kit sync`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`zervo`,project:`zervo`,npm:!0,cargo:!0,check_script:null,workflows:[{file:`check.yml`,runs:[`rustup toolchain install --no-self-update
rustup show active-toolchain
rustfmt --version`,`cargo fmt --check`,`sh -n scripts/audit_daemon.sh
sh -n scripts/servo_gap_sites.sh
python3 -m py_compile scripts/strip_secure_proxy.py`]}]},{repo:`fuz_forge`,project:`fuz_forge`,npm:!0,cargo:!0,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`cargo fmt -p fuz_forge -p fuz_forge_server -p fuz_forge_wire -p testing_fuz_forge_server -p xtask --check`,`cargo clippy --locked --workspace --all-targets -- -D warnings`,`cargo test --locked --workspace`,`cargo test --locked -p fuz_forge_server -- --ignored --test-threads=1`,`cargo xtask check-release`,`cargo doc --locked --workspace --no-deps --document-private-items`,`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`fuz_app`,project:`fuz_app`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`,`curl -fsSL https://bun.sh/install | bash -s "bun-v$CROSS_BUN_VERSION"
echo "$HOME/.bun/bin" >> "$GITHUB_PATH"`,`node --version
bun --version
[ "$(bun --version)" = "$CROSS_BUN_VERSION" ]`,`npm ci`,`npx svelte-kit sync`,`npm run test:cross:ts`,`npm run test:cross:ts-differential`]},{file:`cross-canary.yml`,runs:[`curl -fsSL https://bun.sh/install | bash
echo "$HOME/.bun/bin" >> "$GITHUB_PATH"`,`node --version
bun --version`,`npm ci`,`npx svelte-kit sync`,`FUZ_TEST_CROSS_BACKEND=1 npx vitest run --project cross_backend_ts_bun --project cross_backend_ts_differential`]}]},{repo:`fuz`,project:`fuz`,npm:!1,cargo:!0,check_script:null,workflows:[{file:`check.yml`,runs:[`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`cargo fmt --all --check`,`cargo clippy --locked --workspace --all-targets -- -D warnings`,`cargo test --locked --workspace`,`umask 000
cargo test --locked --workspace`,`cargo xtask check-release`,`cargo doc --locked --workspace --no-deps --all-features --document-private-items`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`scripts/fuzi-gate.sh --glibc-only`,`scripts/install-test.sh`,`scripts/install-test-mutants.sh`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`psql postgres://fuz_test:fuz_test@localhost:5432/fuz_test \\
  -c 'CREATE DATABASE fuz_db_test;' \\
  -c 'CREATE DATABASE fuz_auth_test;' \\
  -c 'CREATE DATABASE fuz_cell_test;' \\
  -c 'CREATE DATABASE fuz_fact_test;' \\
  -c 'CREATE DATABASE fuz_fact_serving_test;' \\
  -c 'CREATE DATABASE fuz_actions_test;' \\
  -c 'CREATE DATABASE fuz_db_admin_test;' \\
  -c 'CREATE DATABASE fuz_realtime_test;' \\
  -c 'CREATE DATABASE fuz_cell_actions_test;'`,`cargo test --locked -p fuz_db -p fuz_http -p fuz_auth -p fuz_cell -p fuz_fact -p fuz_fact_serving -p fuz_actions -p fuz_db_admin -p fuz_realtime -p fuz_cell_actions -- --ignored --test-threads=1`]}]},{repo:`fuz_css`,project:`fuz_css`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`fuz_ui`,project:`fuz_ui`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`fuz_code`,project:`fuz_code`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`mdz`,project:`mdz`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`fuz_blog`,project:`fuz_blog`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`gro`,project:`gro`,npm:!0,cargo:!0,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npm run bootstrap`,`npx @fuzdev/gro check --workspace --build`,`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`cargo xtask check-js`,`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
cargo xtask check-rust`,`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`env -u CARGO_INCREMENTAL cargo xtask check-reproducible`]},{file:`release.yml`,runs:[`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`if [ -e "$BUILD_ROOT" ]; then
  echo "::error::$BUILD_ROOT already exists on this runner"
  exit 1
fi
sudo install -d -o "$(id -u)" -g "$(id -g)" -m 755 "$BUILD_ROOT"
cp -a "$GITHUB_WORKSPACE" "$BUILD_ROOT/gro"
mkdir "$BUILD_ROOT/cargo"
echo "CARGO_HOME=$BUILD_ROOT/cargo" >> "$GITHUB_ENV"`,`version=$(cargo metadata --locked --no-deps --format-version 1 \\
  | jq -r '.packages[] | select(.name == "gro_cli") | .version')
if [ -z "$version" ]; then
  echo "::error::no gro_cli version in Cargo.toml"
  exit 1
fi
if [ "$GITHUB_EVENT_NAME" != push ]; then
  echo "::notice::a $GITHUB_EVENT_NAME run on $GITHUB_REF has no tag: the tag check is skipped, not passed (workspace version $version)"
elif [ "$GITHUB_REF_NAME" != "fgro-v$version" ]; then
  echo "::error::the tag '$GITHUB_REF_NAME' isn't 'fgro-v' + the workspace version '$version' in Cargo.toml"
  exit 1
fi
echo "VERSION=$version" >> "$GITHUB_ENV"`,`cargo xtask fetch-v8`,`sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
cargo xtask build --release --verify`,`line=$(target/gro_snapshot/release/fgro --version)
echo "$line"
case "$line" in
  "fgro $VERSION (commit $GITHUB_SHA, "*", snapshot)") ;;
  *)
    echo "::error::expected 'fgro $VERSION (commit $GITHUB_SHA, …, snapshot)'"
    exit 1
    ;;
esac`,`export LC_ALL=C
binary=target/gro_snapshot/release/fgro
prefix="$BUILD_ROOT/"
roots=(/home/ /Users/ /root/ /.cargo/ /.rustup/)
for dir in "$HOME" "$GITHUB_WORKSPACE" "$RUNNER_TEMP" "$RUNNER_TOOL_CACHE"; do
  dir=\${dir%/}
  if [ -n "$dir" ]; then roots+=("$dir/"); fi
done
# the prefix must be there, so a scan that read nothing fails
if ! grep -qaF -- "$prefix" "$binary"; then
  echo "::error::the binary holds no path under $prefix: the build didn't run from it, or the scan failed"
  exit 1
fi
leaks=$(
  {
    { grep -aobF -- "$prefix" "$binary" || true; } | awk -F: '{ print "P\\t" $1 }'
    for root in "\${roots[@]}"; do
      { grep -aobF -- "$root" "$binary" || true; } | awk -F: -v root="$root" '{ print "R\\t" $1 "\\t" root }'
    done
  } | awk -F '\\t' -v prefix="$prefix" '
    $1 == "P" { in_prefix[$2] = 1; next }
    {
      offset = $2; root = $3; excused = 0
      for (k = 1; k + length(root) - 1 <= length(prefix); k++) {
        if (substr(prefix, k, length(root)) == root && (offset - k + 1) in in_prefix) {
          excused = 1
          break
        }
      }
      if (!excused) print offset "\\t" root
    }
  ' | sort -n -u
)
escaped=$(printf '%s' "$prefix" | sed 's/[][\\\\.*^$+?(){}|]/\\\\&/g')
echo "paths under $prefix in the binary, by their first two components:"
grep -aoE -- "$escaped[A-Za-z0-9._-]+/[A-Za-z0-9._-]+" "$binary" | sort | uniq -c || true
if [ -n "$leaks" ]; then
  echo "::error::the binary contains builder paths outside $prefix"
  head -n 10 <<<"$leaks" | while IFS=$'\\t' read -r offset root; do
    printf '%s at byte %s: ' "$root" "$offset"
    { tail -c "+$((offset + 1))" "$binary" || true; } | head -c 160 | tr -c '[:print:]' '?'
    echo
  done
  exit 1
fi`,`mkdir -p "$RUNNER_TEMP/asset"
cp target/gro_snapshot/release/fgro "$RUNNER_TEMP/asset/fgro-linux-x64-gnu"
sha512=$(sha512sum "$RUNNER_TEMP/asset/fgro-linux-x64-gnu" | cut -d ' ' -f 1)
echo "sha512=$sha512" >> "$GITHUB_OUTPUT"
echo "$sha512  fgro-linux-x64-gnu"`,`downloaded=$(sha512sum fgro-linux-x64-gnu | cut -d ' ' -f 1)
if [ -z "$BUILT_SHA512" ] || [ "$downloaded" != "$BUILT_SHA512" ]; then
  echo "::error::the downloaded binary's SHA-512 '$downloaded' isn't the build job's '$BUILT_SHA512'"
  exit 1
fi
sha512sum fgro-linux-x64-gnu > SHA512SUMS
cat SHA512SUMS`,`version=\${GITHUB_REF_NAME#fgro-v}
notes="$RUNNER_TEMP/release_notes.md"
awk -v heading="## $version" '
  $0 == heading { found = 1; next }
  found && /^## / { exit }
  found { print }
' crates/CHANGELOG.md | sed -e '/./,$!d' > "$notes"
if ! grep -q '[^[:space:]]' "$notes"; then
  echo "::error::crates/CHANGELOG.md has no '## $version' section, or it's empty"
  exit 1
fi
{
  echo
  echo "Linux x86_64 only, built on Ubuntu 24.04, so it needs glibc 2.39 or later (not Debian 12 or Ubuntu 22.04)."
  echo "To verify and install it, see [install](https://github.com/$GITHUB_REPOSITORY/blob/$GITHUB_REF_NAME/src/docs/runtime.md#install)."
} >> "$notes"
cat "$notes"`,`version=\${GITHUB_REF_NAME#fgro-v}
prerelease=()
case "$version" in *-*) prerelease=(--prerelease) ;; esac
gh release create "$GITHUB_REF_NAME" \\
  "$RUNNER_TEMP/assets/fgro-linux-x64-gnu" "$RUNNER_TEMP/assets/SHA512SUMS" \\
  --verify-tag --title "fgro $version" \\
  --notes-file "$RUNNER_TEMP/release_notes.md" \\
  "\${prerelease[@]}"`]}]},{repo:`tsv`,project:`tsv`,npm:!0,cargo:!0,check_script:`cargo fmt --check && npm run format:audit && npm run pins:audit && npm run docs:audit && npm run docs:audit:docsrs && npm run deps:audit && npm run package:audit && npm run typecheck && npm run typecheck:features && npm run typecheck:wasm32 && npm run typecheck:scripts && npm run typecheck:bench-core && npm run conformance:audit && npm run variants:audit && npm run scan:audit && npm run fanout:audit && npm run roundtrip:audit && npm run roundtrip:audit:prettier && npm run discovery:audit && npm run binding:audit && npm run authoring:audit && npm run paren:audit && npm run razor:audit && npm run fuzz:audit && npm run fuzz:audit:debug && npm run test:node && npm run test && npm run test:depth && npm run test:audits && npm run swallow:audit && npm run comments:audit && npm run gaps:audit && npm run blanks:audit && npm run fabrication:audit && npm run census:audit && npm run width:audit && npm run ignore:audit && npm run check:ast-types && npm run check:loc && npm run lint`,workflows:[{file:`check.yml`,runs:[`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`cargo metadata --locked --format-version 1 > /dev/null`,`npm ci`,`npm ci --prefix crates/tsv_debug/sidecar`,`npm run check`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`npm ci`,`npm run build:packages`,`npm run validate:artifacts`,`npm run test:npm:run
npm run test:npm:parse:run
npm run test:npm:all:run`,`npm run test:napi:npm`,`npm run validate:napi`,`npm run test:depth:napi`,`npm run engines:audit`,`npm run test:depth:wasm`,`npm run publish:crates:package`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`npm ci --prefix crates/tsv_debug/sidecar`,`cargo test --locked --workspace --no-fail-fast`,`npm run test:napi`,`npm run test:napi:npm`]},{file:`release.yml`,runs:[`echo "::error::a real publish (dry_run=false) must be dispatched on the release tag, not on '$GITHUB_REF_NAME' — dispatch it on the tag, or leave dry_run=true to rehearse"
exit 1`,`if ! command -v rustup >/dev/null; then
  curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain none
  echo "$HOME/.cargo/bin" >> "$GITHUB_PATH"
  export PATH="$HOME/.cargo/bin:$PATH"
fi
rustup toolchain install --no-self-update
rustup component add llvm-tools-preview
rustup show active-toolchain`,`mkdir -p .pgo
node scripts/pgo/pgo.ts corpora --fetch`,`cargo build --locked -p tsv_cli --release
sh scripts/pgo/build.sh instrument .pgo`,`docker run --rm -v "$PWD:/work" -w /work \\
  -e CARGO_HOME=/work/.container-cargo \\
  -e RUSTUP_HOME=/work/.container-rustup \\
  almalinux:8 bash -ec '
    dnf install -y -q gcc curl
    curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain none
    export PATH="/work/.container-cargo/bin:$PATH"
    rustup toolchain install --no-self-update
    cargo build --locked -p tsv_cli --release
    sh scripts/pgo/build.sh instrument .pgo'`,`channel=$(sed -n 's/^channel = "\\(.*\\)"$/\\1/p' rust-toolchain.toml)
docker run --rm -v "$PWD:/work" -w /work \\
  -e CARGO_HOME=/work/.container-cargo \\
  -e RUSTFLAGS='-C target-feature=-crt-static' \\
  "rust:\${channel:?no channel in rust-toolchain.toml}-alpine" sh -ec '
    apk add --no-cache musl-dev
    rustup toolchain install --no-self-update
    cargo build --locked -p tsv_cli --release
    sh scripts/pgo/build.sh instrument .pgo'`,"node scripts/pgo/pgo.ts stage --phase instrument --triple ${{ matrix.triple }}","node scripts/pgo/pgo.ts train --triple ${{ matrix.triple }}",`docker run --rm -v "$PWD:/work" -v "$PWD/../corpora:/corpora:ro" -w /work \\
  node:24.14.1-alpine \\
  node scripts/pgo/pgo.ts train --triple \${{ matrix.triple }} --corpora /corpora`,"node scripts/pgo/pgo.ts merge --triple ${{ matrix.triple }}",`sh scripts/pgo/build.sh use .pgo`,`docker run --rm -v "$PWD:/work" -w /work \\
  -e CARGO_HOME=/work/.container-cargo \\
  -e RUSTUP_HOME=/work/.container-rustup \\
  almalinux:8 bash -ec '
    dnf install -y -q gcc
    export PATH="/work/.container-cargo/bin:$PATH"
    sh scripts/pgo/build.sh use .pgo'`,`channel=$(sed -n 's/^channel = "\\(.*\\)"$/\\1/p' rust-toolchain.toml)
docker run --rm -v "$PWD:/work" -w /work \\
  -e CARGO_HOME=/work/.container-cargo \\
  -e RUSTFLAGS='-C target-feature=-crt-static' \\
  "rust:\${channel:?no channel in rust-toolchain.toml}-alpine" sh -ec '
    apk add --no-cache musl-dev
    rustup toolchain install --no-self-update
    sh scripts/pgo/build.sh use .pgo'`,"node scripts/pgo/pgo.ts gate-builds --triple ${{ matrix.triple }}\nnode scripts/pgo/pgo.ts gate-sections --triple ${{ matrix.triple }}","node scripts/pgo/pgo.ts stage --phase use --triple ${{ matrix.triple }}",`for artifact in crates/tsv_napi/pkg/\${{ matrix.triple }}/tsv_napi.node crates/tsv_napi/pkg/\${{ matrix.triple }}/tsv; do
  # objdump runs alone (not in the substitution pipeline) so an unreadable
  # artifact fails the step loudly instead of vanishing under pipefail; the
  # grep pipeline takes \`|| true\` so a no-match yields the visible "none"
  # rather than killing the step inside the assignment.
  objdump -T "$artifact" > /tmp/syms.txt
  max=$(grep -oE 'GLIBC_[0-9]+\\.[0-9]+' /tmp/syms.txt | sort -uV | tail -1 || true)
  echo "$artifact max versioned glibc symbol: \${max:-none}"
  if [ -n "$max" ]; then
    top=$(printf '%s\\nGLIBC_2.28\\n' "$max" | sort -V | tail -1)
    if [ "$top" != "GLIBC_2.28" ]; then
      echo "FAIL: glibc floor exceeded in $artifact ($max > 2.28) — was the build run outside the container?"
      exit 1
    fi
  fi
done`,`for artifact in crates/tsv_napi/pkg/\${{ matrix.triple }}/tsv_napi.node crates/tsv_napi/pkg/\${{ matrix.triple }}/tsv; do
  # objdump runs alone first: inside the \`if\` pipeline its failure — exactly
  # what a missing or non-dynamic artifact produces — would read as "no
  # GLIBC_ refs" and pass the gate vacuously.
  objdump -T "$artifact" > /tmp/syms.txt
  if grep -q 'GLIBC_' /tmp/syms.txt; then
    echo "FAIL: musl artifact $artifact references GLIBC_ symbols"
    exit 1
  fi
done`,"node scripts/pgo/pgo.ts byteid --triple ${{ matrix.triple }}",`docker run --rm -v "$PWD:/work" -v "$PWD/../corpora:/corpora:ro" -w /work \\
  node:24.14.1-alpine \\
  node scripts/pgo/pgo.ts byteid --triple \${{ matrix.triple }} --corpora /corpora`,`CARGO_TARGET_DIR=.pgo/target-shapes node scripts/pgo/pgo.ts depth-shapes`,"node scripts/pgo/pgo.ts depth --triple ${{ matrix.triple }}",`docker run --rm -v "$PWD:/work" -w /work \\
  node:24.14.1-alpine \\
  node scripts/pgo/pgo.ts depth --triple \${{ matrix.triple }}`,"node scripts/roots/validate_napi_artifact.ts --triple ${{ matrix.triple }} --pgo",`node --test scripts/test_napi_npm.ts`,`docker run --rm -v "$PWD:/work" -w /work node:24.14.1-alpine \\
  node --test scripts/test_napi_npm.ts`,`for d in crates/tsv_napi/pkg/napi-*; do
  mv "$d" "crates/tsv_napi/pkg/\${d##*/napi-}"
done
ls crates/tsv_napi/pkg`,`node scripts/roots/build_napi_packages.ts --loader-only`,`flags=()
if [ "$GITHUB_REF_TYPE" = "tag" ]; then
  flags+=(--expect-tag "$GITHUB_REF_NAME")
fi
if [ "$GITHUB_EVENT_NAME" = "schedule" ] || [ "$DRY_RUN" = "true" ]; then
  # schedule is ALWAYS dry-run — see the trigger comment.
  flags+=(--dry-run)
elif [ "$GITHUB_REF_TYPE" != "tag" ]; then
  echo "::error::refusing a real publish off the non-tag ref '$GITHUB_REF_NAME' — dispatch it on the release tag"
  exit 1
else
  flags+=(--provenance)
fi
node scripts/roots/publish_napi.ts "\${flags[@]}"`,`node scripts/roots/release_notes.ts "$GITHUB_REF_NAME" > "$RUNNER_TEMP/release_notes.md"
cat "$RUNNER_TEMP/release_notes.md"`,`node scripts/roots/release_assets.ts "$GITHUB_REF_NAME" --out "$RUNNER_TEMP/assets"
cat "$RUNNER_TEMP/assets/SHA512SUMS"`,`if gh release view "$GITHUB_REF_NAME" --json tagName >/dev/null 2>&1; then
  echo "Release $GITHUB_REF_NAME already exists — re-uploading assets only"
  gh release upload "$GITHUB_REF_NAME" "$RUNNER_TEMP"/assets/* --clobber
else
  gh release create "$GITHUB_REF_NAME" "$RUNNER_TEMP"/assets/* --verify-tag \\
    --title "$GITHUB_REF_NAME" --notes-file "$RUNNER_TEMP/release_notes.md"
fi`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`npm ci`,`flags=()
if [ "$GITHUB_REF_TYPE" = "tag" ]; then
  flags+=(--expect-tag "$GITHUB_REF_NAME")
fi
npm run publish:crates -- "\${flags[@]}"`]}]},{repo:`tsv.fuz.dev`,project:`tsv`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`vscode-extension-tsv-format`,project:`tsv-format`,npm:!0,cargo:!1,check_script:`npm run typecheck && npm run build && npm run test`,workflows:[]},{repo:`svelte-docinfo`,project:`svelte-docinfo`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npm run setup-examples`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`fuz_repos`,project:`fuz_repos`,npm:!0,cargo:!0,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`,`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`git --version
version=$(git --version | awk '{print $3}')
if ! printf '%s\\n%s\\n' 2.44.0 "$version" | sort -V -C; then
  echo "::error::the fuz_repos tests need git 2.44 or newer, found $version"
  exit 1
fi`,`cargo fmt --check`,`cargo clippy --workspace --all-targets --locked -- -D warnings`,`cargo doc --workspace --no-deps --all-features --document-private-items --locked`,`cargo test --workspace --locked --no-fail-fast`]}]},{repo:`docs.fuz.dev`,project:`fuz-stack`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`corpora`,project:`corpora`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace`,`npm run materialize:check`]}]},{repo:`fuz_util`,project:`fuz_util`,npm:!0,cargo:!1,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`]}]},{repo:`fuz_schema`,project:`fuz_schema`,npm:!0,cargo:!0,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`npm ci`,`npx @fuzdev/gro check --workspace --build`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`cargo fmt --check`,`cargo clippy --workspace --all-targets -- -D warnings`,`cargo test --workspace`,`cargo doc --workspace --no-deps --all-features --document-private-items`,`cargo build -p fuz_schema_wasm --target wasm32-unknown-unknown --release
wasm="\${CARGO_TARGET_DIR:-target}/wasm32-unknown-unknown/release/fuz_schema_wasm.wasm"
ceiling_file=crates/fuz_schema_wasm/wasm_size_ceiling.txt
size=$(wc -c < "$wasm")
# the one line that is not a comment, which may be indented, or blank;
# a second keeps its newline, which the number check refuses
ceiling=$(grep -vE '^[[:space:]]*(#|$)' "$ceiling_file" | tr -d ' \\t\\r' || true)
case $ceiling in
  '' | *[!0-9]*)
    echo "::error file=$ceiling_file::no ceiling read from $ceiling_file: it holds one number of bytes, and # comments"
    exit 1
    ;;
esac
echo "fuz_schema_wasm.wasm: $size bytes, ceiling $ceiling"
if [ "$size" -gt "$ceiling" ]; then
  echo "::error file=$ceiling_file::fuz_schema_wasm.wasm is $size bytes, over the ceiling of $ceiling. The build reaches code it didn't: diff an unstripped build (CARGO_PROFILE_RELEASE_STRIP=false) against one under the ceiling with twiggy diff, and keep what the wasm reaches from reaching the issues. Raise the ceiling in $ceiling_file only for growth that is meant."
  exit 1
fi`]}]},{repo:`blake3`,project:`blake3`,npm:!0,cargo:!0,check_script:`npm run typecheck && npm run test:rust && npm run test:tooling && npm run lint && npm run lint:docs && cargo fmt --all --check && tsv format --check .`,workflows:[]},{repo:`zap`,project:`zap`,npm:!0,cargo:!0,check_script:`gro check`,workflows:[{file:`check.yml`,runs:[`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`npm ci`,`if ! command -v busybox >/dev/null || ! command -v setfacl >/dev/null; then
  sudo apt-get update
  sudo apt-get install -y busybox acl
fi
busybox true
getfacl --version`,`cargo fmt -p zap -p zap_core -p zap_types -p xtask --check`,`cargo clippy --locked --workspace --all-targets -- -D warnings`,`cargo test --locked --workspace`,`umask 000
cargo test --locked --workspace`,`echo "::warning::zap config validate e2e skipped: no fgro build in CI (ZAP_FGRO unset)"
target/debug/zap version`,`npx @fuzdev/gro check --workspace --build`,`cargo xtask check-release`,`cargo doc --locked --workspace --no-deps --all-features --document-private-items`]}]},{repo:`pglet`,project:`pglet`,npm:!0,cargo:!0,check_script:`cargo clippy --workspace --all-targets -- -D warnings && npm run check:stripped && npm run check:wasm-features && cargo fmt --check && npm run check:docs && npm run check:ts && npm run check:benches && npm run check:release`,workflows:[{file:`check.yml`,runs:[`rustup toolchain install --no-self-update
rustup show active-toolchain
cargo --version`,`npm ci`,`cargo metadata --locked --format-version 1 > /dev/null`,`npm run check`,`npm run test:rust`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`npm ci`,`npm run test:npm`,`npm run size:check`,`npm run wasm:build:opfs && grep -q 'class PgletBtreePersistent' crates/pglet_wasm/pkg-opfs/pglet_wasm.d.ts`,`rustup toolchain install --no-self-update
rustup show active-toolchain`,`sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -sS -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \\
  https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \\
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \\
  | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
sudo apt-get update
sudo apt-get install -y --no-install-recommends postgresql-client-18
echo /usr/lib/postgresql/18/bin >> "$GITHUB_PATH"`,`psql --version
pg_dump --version
test "$(pg_dump --version | grep -oE '[0-9]+' | head -1)" -ge 18`,`cargo xtask gates --check --only test:fixtures,test:fixtures:profile-lock,test:dump,test:pg-dump,test:copy,test:keywords`]}]}],edges:[{from:`corpora`,from_repo:`corpora`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`blake3`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_code`,from_repo:`fuz_code`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_css`,from_repo:`fuz_css`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_schema`,from_repo:`fuz_schema`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_ui`,from_repo:`fuz_ui`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_util`,from_repo:`fuz_util`,to:`blake3`,manifest:`npm`,kind:`peer_optional`,via:[`@fuzdev/blake3-wasm`]},{from:`gro`,from_repo:`gro`,to:`blake3`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/blake3-wasm`]},{from:`mdz`,from_repo:`mdz`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`svelte-docinfo`,from_repo:`svelte-docinfo`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`tsv`,from_repo:`tsv`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`zap`,from_repo:`zap`,to:`blake3`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/blake3-wasm`]},{from:`zzz`,from_repo:`zzz`,to:`blake3`,manifest:`npm`,kind:`runtime`,via:[`@fuzdev/blake3-wasm`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`fuz`,manifest:`cargo`,source:`path`,kind:`runtime`,via:[`fuz_actions`,`fuz_artifact`,`fuz_auth`,`fuz_cell`,`fuz_cell_actions`,`fuz_crypto`,`fuz_db`,`fuz_db_admin`,`fuz_fact`,`fuz_fact_serving`,`fuz_http`,`fuz_realtime`,`fuz_release`,`fuz_sign`,`fuz_storage`,`fuz_sys`]},{from:`zap`,from_repo:`zap`,to:`fuz`,manifest:`cargo`,source:`path`,kind:`runtime`,via:[`fuz_eval`]},{from:`zzz`,from_repo:`zzz`,to:`fuz`,manifest:`cargo`,source:`path`,kind:`runtime`,via:[`fuz_actions`,`fuz_auth`,`fuz_db`,`fuz_http`,`fuz_pty`,`fuz_realtime`,`fuz_sys`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`fuz_app`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_app`]},{from:`zzz`,from_repo:`zzz`,to:`fuz_app`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_app`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz_css`,from_repo:`fuz_css`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz_schema`,from_repo:`fuz_schema`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz_ui`,from_repo:`fuz_ui`,to:`fuz_code`,manifest:`npm`,kind:`peer_optional`,via:[`@fuzdev/fuz_code`]},{from:`fuz_util`,from_repo:`fuz_util`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`gro`,from_repo:`gro`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`mdz`,from_repo:`mdz`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`svelte-docinfo`,from_repo:`svelte-docinfo`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`zap`,from_repo:`zap`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`zzz`,from_repo:`zzz`,to:`fuz_code`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_code`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`fuz_css`,manifest:`npm`,kind:`peer_optional`,via:[`@fuzdev/fuz_css`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`fuz_css`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_css`]},{from:`fuz_code`,from_repo:`fuz_code`,to:`fuz_css`,manifest:`npm`,kind:`peer_optional`,via:[`@fuzdev/fuz_css`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`fuz_css`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_css`]},{from:`fuz_schema`,from_repo:`fuz_schema`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`fuz_ui`,from_repo:`fuz_ui`,to:`fuz_css`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_css`]},{from:`fuz_util`,from_repo:`fuz_util`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`gro`,from_repo:`gro`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`mdz`,from_repo:`mdz`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`svelte-docinfo`,from_repo:`svelte-docinfo`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`zap`,from_repo:`zap`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`zzz`,from_repo:`zzz`,to:`fuz_css`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_css`]},{from:`zzz`,from_repo:`zzz`,to:`fuz_repos`,manifest:`cargo`,source:`path`,kind:`runtime`,via:[`fuz_git`,`fuz_repos`]},{from:`blake3`,from_repo:`blake3`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`corpora`,from_repo:`corpora`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`fuz_schema`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`fuz_schema`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_code`,from_repo:`fuz_code`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_css`,from_repo:`fuz_css`,to:`fuz_schema`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`fuz_schema`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_ui`,from_repo:`fuz_ui`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`fuz_util`,from_repo:`fuz_util`,to:`fuz_schema`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_schema`]},{from:`gro`,from_repo:`gro`,to:`fuz_schema`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_schema`]},{from:`mdz`,from_repo:`mdz`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`svelte-docinfo`,from_repo:`svelte-docinfo`,to:`fuz_schema`,manifest:`npm`,kind:`runtime`,via:[`@fuzdev/fuz_schema`]},{from:`tsv`,from_repo:`tsv`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`zap`,from_repo:`zap`,to:`fuz_schema`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_schema`]},{from:`zzz`,from_repo:`zzz`,to:`fuz_schema`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_schema`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`fuz_ui`,manifest:`npm`,kind:`peer_optional`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`fuz_ui`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_code`,from_repo:`fuz_code`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_css`,from_repo:`fuz_css`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`fuz_ui`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_schema`,from_repo:`fuz_schema`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`fuz_util`,from_repo:`fuz_util`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`gro`,from_repo:`gro`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`mdz`,from_repo:`mdz`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`svelte-docinfo`,from_repo:`svelte-docinfo`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`zap`,from_repo:`zap`,to:`fuz_ui`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_ui`]},{from:`zzz`,from_repo:`zzz`,to:`fuz_ui`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_ui`]},{from:`blake3`,from_repo:`blake3`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`corpora`,from_repo:`corpora`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`fuz_code`,from_repo:`fuz_code`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`fuz_css`,from_repo:`fuz_css`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`fuz_schema`,from_repo:`fuz_schema`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`fuz_ui`,from_repo:`fuz_ui`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`gro`,from_repo:`gro`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`mdz`,from_repo:`mdz`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`pglet`,from_repo:`pglet`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`svelte-docinfo`,from_repo:`svelte-docinfo`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`tsv`,from_repo:`tsv`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`zap`,from_repo:`zap`,to:`fuz_util`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/fuz_util`]},{from:`zzz`,from_repo:`zzz`,to:`fuz_util`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/fuz_util`]},{from:`blake3`,from_repo:`blake3`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`corpora`,from_repo:`corpora`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`gro`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/gro`]},{from:`fuz_code`,from_repo:`fuz_code`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz_css`,from_repo:`fuz_css`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`gro`,manifest:`npm`,kind:`peer`,via:[`@fuzdev/gro`]},{from:`fuz_schema`,from_repo:`fuz_schema`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz_ui`,from_repo:`fuz_ui`,to:`gro`,manifest:`npm`,kind:`peer_optional`,via:[`@fuzdev/gro`]},{from:`fuz_util`,from_repo:`fuz_util`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`mdz`,from_repo:`mdz`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`pglet`,from_repo:`pglet`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`svelte-docinfo`,from_repo:`svelte-docinfo`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`tsv`,from_repo:`tsv`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`zap`,from_repo:`zap`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`zzz`,from_repo:`zzz`,to:`gro`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/gro`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_code`,from_repo:`fuz_code`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_css`,from_repo:`fuz_css`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_schema`,from_repo:`fuz_schema`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_ui`,from_repo:`fuz_ui`,to:`mdz`,manifest:`npm`,kind:`peer_optional`,via:[`@fuzdev/mdz`]},{from:`fuz_util`,from_repo:`fuz_util`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`gro`,from_repo:`gro`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`svelte-docinfo`,from_repo:`svelte-docinfo`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`zap`,from_repo:`zap`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`zzz`,from_repo:`zzz`,to:`mdz`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/mdz`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`pglet`,manifest:`npm`,kind:`peer_optional`,via:[`@fuzdev/pglet-wasm`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`pglet`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/pglet-wasm`]},{from:`fuz-stack`,from_repo:`docs.fuz.dev`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_app`,from_repo:`fuz_app`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_blog`,from_repo:`fuz_blog`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_code`,from_repo:`fuz_code`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_css`,from_repo:`fuz_css`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_repos`,from_repo:`fuz_repos`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_schema`,from_repo:`fuz_schema`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_template`,from_repo:`fuz_template`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_ui`,from_repo:`fuz_ui`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`fuz_util`,from_repo:`fuz_util`,to:`svelte-docinfo`,manifest:`npm`,kind:`peer_optional`,via:[`svelte-docinfo`]},{from:`gro`,from_repo:`gro`,to:`svelte-docinfo`,manifest:`npm`,kind:`peer_optional`,via:[`svelte-docinfo`]},{from:`mdz`,from_repo:`mdz`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`tsv`,from_repo:`tsv.fuz.dev`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`zap`,from_repo:`zap`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`zzz`,from_repo:`zzz`,to:`svelte-docinfo`,manifest:`npm`,kind:`dev`,via:[`svelte-docinfo`]},{from:`blake3`,from_repo:`blake3`,to:`tsv`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/tsv`]},{from:`gro`,from_repo:`gro`,to:`tsv`,manifest:`cargo`,source:`registry`,kind:`runtime`,via:[`tsv_ts`]},{from:`gro`,from_repo:`gro`,to:`tsv`,manifest:`npm`,kind:`runtime`,via:[`@fuzdev/tsv`]},{from:`tsv-format`,from_repo:`vscode-extension-tsv-format`,to:`tsv`,manifest:`npm`,kind:`runtime`,via:[`@fuzdev/tsv-format-wasm`]},{from:`fuz_forge`,from_repo:`fuz_forge`,to:`zap`,manifest:`npm`,kind:`dev`,via:[`@fuzdev/zap`]}]}),S=(e,t)=>u.indexOf(e.kind)-u.indexOf(t.kind),C=e=>x.edges.filter(t=>t.from===e.name).toSorted(S),w=e=>x.edges.filter(t=>t.to===e.name).toSorted(S),T=e=>x.repos.filter(t=>t.project===e.name);export{y as a,u as c,l as d,x as i,v as l,w as n,b as o,C as r,f as s,T as t,c as u};