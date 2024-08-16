start main

{% include [Text](file.md) %}

{% include [Text](file-2.md) %}

{% include [Text](file-3.md) %}

{% include [Text](file-4.md) %}

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
{% included (./file-3.md) %}
start abc 3

middle abc 3

end abc 3
{% endincluded %}
{% included (./file-4.md) %}
start abc 4

middle abc 4

end abc 4
{% endincluded %}