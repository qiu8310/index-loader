# index-loader

根据 map 文件按需加载需要的脚本


## Installation

再运行下面命令创建新项目

```bash
npm i --save-dev index-loader
```

## Usage


```js
// webpack.config.js
{
  loader: 'index-loader',
  options: {
    debug: false, // 输出调试信息（全局）
    targets: [
      {
        name: 'antd',
        entryFile: 'path/to/es/antd.js', // 需要是绝对路径
        debug: false,
        additional(src, variables) {
          return `import "xxx.css"`
        }
      }
    ]

  }
}
```

```ts
export type Target = MapTarget | ModuleTarget

interface BaseTarget {
  name: string
  /** 输出替换信息 */
  debug?: boolean
  /** 添加额外的代码 */
  additional?: (src: string, variables: string[], target: ResolvedTarget) => void | string | string[]
  /** 获取依赖的相对路径（注意，最好返回 unix 系统的路径） */
  getRequiredPath?: (
    /**
     * 依赖的变量名，如
     * `import { A } from 'antd'` 中的 "A"
     */
    importedKey: string,
    /**
     * 当前所在的文件
     */
    contextFile: string,
    /**
     * 依赖的文件解析后的路径
     */
    requiredFile: string,
    target: ResolvedTarget
  ) => string
}
export interface MapTarget extends BaseTarget {
  /** 如果没有映射文件，则需要指定 rootDir 和 getRequiredPath */
  mapFile?: string
  mapJson?: {[key: string]: string}
  /** 项目根目录，默认使用 mapFile 的目录 */
  rootDir?: string
}
export interface ModuleTarget extends BaseTarget {
  /** entry file 的 module 类型 */
  entryModule?: 'esnext' | 'commonjs' | 'both'
  entryFile: string
  /** 是否缓存生成的 map 信息 */
  cache?: boolean
}
```

## Map File Example

```json
{
  "Swipe": "swipe/~S",
  "SwipeItem": "swipe/",
  "Marquee": "marquee/~default",
  "TabContainer": "tab-container/",
  "TabContainerItem": "tab-container/",
  "Sticker": "sticker/~default",
  "Indicator": "indicator/~default",
  "Toast": "toast/~default"
}
```


## Support

- 咨询：Mora <qiuzhongleiabc@126.com>

<!--
## Roadmap

If you have ideas for releases in the future, it is a good idea to list them in the README.
-->

## Changelog

[Changelog](./CHANGELOG.md)


## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.


## License

[MIT](https://choosealicense.com/licenses/mit/)
