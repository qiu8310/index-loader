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
        // 几个 File 只需要选一个即可
        // 如果使用了 moduleFile / esModuleFile / commonModuleFile，系统会自动解析出 mapFile
        mapFile: 'path/to/map/file.json', // 需要是绝对路径

        moduleFile: 'path/to/module/file.js',   // 解析 require / exports 和 import / export
        esModuleFile: 'path/to/es/module/file.js',  // 解析 import / export
        commonModuleFile: 'path/to/common/module/file.js', // 解析 require / exports

        debug: false,
        additional(src, variables) {
          return `import "xxx.css"`
        }
      }
    ]

  }
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

## TODO

```js
import Test from 'antd'
// 需要支持解析 antd 中的 default export 或 module.exports =
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
