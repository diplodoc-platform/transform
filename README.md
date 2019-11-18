[![oko health](https://badger.yandex-team.ru/oko/repo/data-ui/yfm/health.svg)](https://oko.yandex-team.ru/repo/data-ui/yfm)

Трансформер YFM (Yandex Flavored Markdown) -> HTML

[Описание синтаксиса YFM](./DOCS.md)

## Исходники
### Установка
```bash
git clone git@github.yandex-team.ru:data-ui/yfm.git
cd yfm
npm install
```

### Использование
```bash
npm run transform -- --source ./md-sources-dir --dest ./html-output --styles --vars {\"user\":{\"name\":\"Alice\"}}
```

### Сборка bin-файла
```bash
npm install -g pkg
pkg ./
```

## npm-пакет
### Установка
```bash
npm install yfm-transform
```

Для использования CLI будет удобнее поставить пакет глобально:
```bash
sudo npm install -g yfm-transform
```

При добавлении изменений в файлы из директории src перед обновлением версии пакета нужно выполнить
```bash
npm run dist
```

### Использование
**CLI**
```bash
yfm-transform --source ./md-sources-dir --dest ./html-output --styles --vars {\"user\":{\"name\":\"Alice\"}}
```

**API**
```js
const fs = require('fs');
const transform = require('yfm-transform');

const root = '/path/to/docs/root'; // optional
const path = '/path/to/markdown/file.md';
const content = fs.readFileSync(filePath, 'utf');
const vars = { user: { name: 'Alice' } };

const {html, meta} = transform(content, {root, path, vars});
```

## License

Mozilla Public License
Version 2.0
