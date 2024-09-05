start main

{% include [Text](_includes/file.md) %}

end main
{% included (./_includes/file.md) %}
start abc

{% include [Text](./plugins.md) %}

end abc
{% included (./_includes/plugins.md) %}
abc nested
{% endincluded %}
{% endincluded %}