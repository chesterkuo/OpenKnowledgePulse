---
sidebar_position: 2
title: 贡献指南
description: KnowledgePulse 的代码风格、测试规范和 PR 流程。
---

# 贡献指南

感谢你对 KnowledgePulse 项目的贡献兴趣。本文档涵盖了项目的代码风格、测试要求和 Pull Request 流程。

## 代码风格

- **格式化与检查：** [Biome](https://biomejs.dev/) 同时负责代码格式化和静态检查。提交 PR 前请运行 `bun run lint`。
- **TypeScript：** 所有包均启用严格模式。对外部输入使用 [Zod](https://zod.dev/) v3 进行运行时验证。
- **导入：** 优先使用具名导入，避免使用通配符（`*`）导入。

## 测试

- **框架：** `bun:test`（Bun 内置）。
- **文件位置：** 测试文件与被测源文件放在同一目录下，使用 `*.test.ts` 后缀。
- **运行测试套件：**

  ```bash
  bun test --recursive
  ```

  目前完整测试套件包含 15 个文件中的 319 个测试。所有测试必须通过才能合并 PR。

- **Schema 变更：** 任何对 Zod schema 或 KnowledgeUnit 结构的修改都必须包含：
  1. **迁移函数**：将数据从旧版 schema 转换为新版。
  2. **往返测试**：证明数据经过序列化、迁移和反序列化后不会丢失。

## 构建说明

SDK 使用 **tsup** 构建，输出 ESM、CJS 和 TypeScript 声明文件（`.d.ts`）。SDK 的 `tsconfig.json` 刻意设置了 `"types": []`——这是为了避免 `bun-types` 与 tsup 的 DTS 生成插件之间的冲突。请勿移除此设置。

## Pull Request 流程

1. **Fork** 仓库并从 `main` 创建功能分支。
2. **实现**你的修改，遵循上述代码风格指南。
3. **编写或更新测试**以覆盖你的修改。
4. **运行完整测试套件**并确认所有测试通过：

   ```bash
   bun test --recursive
   ```

5. **检查代码：**

   ```bash
   bun run lint
   ```

6. **提交 Pull Request** 到 `main` 分支，并附上清晰的变更描述和动机说明。

## 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 风格：

```
<type>(<scope>): <简短描述>
```

常见类型：

| 类型 | 使用场景 |
|---|---|
| `feat` | 新功能或新特性 |
| `fix` | Bug 修复 |
| `docs` | 仅文档变更 |
| `refactor` | 不改变行为的代码重构 |
| `test` | 添加或更新测试 |
| `chore` | 构建配置、CI 或工具链变更 |

示例：

```
feat(sdk): add vector similarity caching
fix(mcp-server): handle missing API key in proxy mode
test(cli): add integration tests for kp search
```

## 许可证

所有贡献均基于 [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) 许可证，与项目其余部分保持一致。
