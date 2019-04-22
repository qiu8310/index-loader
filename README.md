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
        mapFile: 'path/to/map/file', // 需要是绝对路径
        debug: false,
        additional(src, variables) {
          return `import "xxx.css"`
        }
      }
    ]

  }
}

```


## Support

- 咨询：Mora <qiuzhongleiabc@126.com>

<!--
## Roadmap

If you have ideas for releases in the future, it is a good idea to list them in the README.
-->

## Changelog

[Changelog][./CHANGELOG.md]


## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.


## License

[MIT](https://choosealicense.com/licenses/mit/)
