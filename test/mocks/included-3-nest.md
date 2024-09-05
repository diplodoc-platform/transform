start main

{% include [Text](_includes/file.md) %}

{% include [Text](_includes/plugins.md) %}

{% include [Text](_includes/sub-plugins.md) %}

end main
{% included (./_includes/file.md) %}
start 1

{% include [Text](./plugins.md) %}

end 1
{% included (./_includes/plugins.md) %}
start 2

{% include [Text](./sub-plugins.md) %}

end 2
{% included (./_includes/sub-plugins.md) %}
start 3

end 3
{% endincluded %}
{% endincluded %}
{% endincluded %}