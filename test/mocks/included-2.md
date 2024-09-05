start main

{% include [Text](file.md) %}

{% include [Text](file-2.md) %}

end main
{% included (./file.md) %}
start abc 1

middle abc 1

end abc 1
{% endincluded %}
{% included (./file-2.md) %}
start abc 2

middle abc 2

end abc 2
{% endincluded %}