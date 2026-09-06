# `private-counter-016/`

Generated code only. **The source lives one directory over**, at
[`../private-counter-twin/private-counter.compact`](../private-counter-twin/private-counter.compact),
because both builds are compiled from that one file: this directory is the
RETAINED-toolchain build of it (compiler 0.31.1, language 0.23.0, runtime
0.16.0), and `../private-counter-twin/compiled/` is the current-toolchain build
of the same source (compiler 0.34.0, runtime 0.19.0-rc.0).

Do not edit anything here by hand, and never recompile one side alone — the
consuming test asserts that the two builds still agree, and that both still
match the source's digest. What the pair is for, what is committed, and how to
regenerate both sides together is in [`../README.md`](../README.md).
