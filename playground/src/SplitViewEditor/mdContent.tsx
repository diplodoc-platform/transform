export default `
#### YFM синтаксис

Синтаксис Yandex Flavored Markdown базируется на CommonMark Spec, 
дополняя его уникальными элементами из других языков разметки и 
шаблонизаторов. В частности:

---

#### Каты

{% cut "Заголовок ката" %}

Контент, который отобразится по нажатию.

{% endcut %}

---

#### Табы 

{% list tabs %}

- Название таба1

  Текст таба1.

   * Можно использовать списки.

   * И **другую** разметку.

- Название таба2

  Текст таба2.

{% endlist %}

---

#### Заметки

{% note tip %}

Еще больше примеров синтаксиса в нашей [документации](https://ydocs.tech/en/)

{% endnote %}
`.trim();
