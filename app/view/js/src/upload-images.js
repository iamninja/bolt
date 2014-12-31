/**
 * Model, Collection and View for Imagelist.
 */

var ImageModel = Backbone.Model.extend({

    defaults: {
        id: null,
        filename: null,
        title: "Untitled",
        order: 1
    },

    initialize: function () {
    }

});

var Imagelist = Backbone.Collection.extend({

    model: ImageModel,

    comparator: function (upload) {
        return upload.get('order');
    },

    setOrder: function (id, order, title) {
        _.each(this.models, function (item) {
            if (item.get('id') === id) {
                item.set('order', order);
                item.set('title', title);
            }
        });
    }

});

var ImagelistHolder = Backbone.View.extend({

    initialize: function (id) {
        this.list = new Imagelist();
        var prelist = $('#' + this.id).val();
        if (prelist !== "") {
            prelist = $.parseJSON($('#' + this.id).val());
            _.each(prelist, function (item) {
                var image = new ImageModel({
                    filename: item.filename,
                    title: item.title,
                    id: this.list.length
                });
                this.list.add(image);
            }, this);
        }
        this.render();
        this.bindEvents();
    },

    render: function () {
        this.list.sort();

        var list = $('#imagelist-' + this.id + ' .list'),
            data = list.data('list'),
            index = 0;

        list.html('');
        _.each(this.list.models, function (image) {
            image.set('id', index++);

            var element = $(data.item.
                replace(/<ID>/g, image.get('id')).
                replace(/<VAL>/g, _.escape(image.get('title'))).
                replace(/<PATH>/g, bolt.paths.bolt).
                replace(/<FNAME>/g, image.get('filename')));

            element.find('.thumbnail-link').magnificPopup({type: 'image'});

            list.append(element);
        });
        if (this.list.models.length === 0) {
            list.append(data.empty);
        }
        this.serialize();
    },

    add: function (filename, title) {
        this.list.add(new ImageModel({
            filename: filename,
            title: title,
            id: this.list.length
        }));
        this.render();
    },

    remove: function (id, dontRender) {
        var done = false;
        _.each(this.list.models, function (item) {
            if (!done && item.get('id') === id) {
                this.list.remove(item);
                done = true;
            }
        }, this);

        if (!dontRender) {
            this.render();
        }
    },

    serialize: function () {
        var ser = JSON.stringify(this.list);
        $('#' + this.id).val(ser);
    },

    doneSort: function () {
        var list = this.list; // jQuery's .each overwrites 'this' scope, set it here.
        $('#imagelist-' + this.id + ' .list div').each(function (index) {
            var id = $(this).data('id'),
                title = $(this).find('input').val();

            list.setOrder(id, index, title);
        });
        this.render();
    },

    bindEvents: function () {
        var $this = this,
            contentkey = this.id,
            $holder = $('#imagelist-' + this.id);

        $holder.find("div.list").sortable({
            helper: function (e, item) {
                if (!item.hasClass('selected')) {
                    item.toggleClass('selected');
                }

                return $('<div></div>');
            },
            start: function (e, ui) {
                var elements = $holder.find('.selected').not('.ui-sortable-placeholder');


                var len = elements.length;

                var currentOuterHeight = ui.placeholder.outerHeight(true),
                    currentInnerHeight = ui.placeholder.height(),
                    margin = parseInt(ui.placeholder.css('margin-top')) + parseInt(ui.placeholder.css('margin-bottom'));

                elements.css('display', 'none');

                ui.placeholder.height(currentInnerHeight + len * currentOuterHeight - currentOuterHeight - margin);

                ui.item.data('items', elements);
            },
            beforeStop: function (e, ui) {
                ui.item.before(ui.item.data('items'));
            },
            stop: function () {
                $holder.find('.ui-state-active').css('display', '');
                $this.doneSort();
            },
            delay: 100,
            distance: 5
        });

        $('#fileupload-' + contentkey)
            .fileupload({
                dataType: 'json',
                dropZone: $holder,
                done: function (e, data) {
                    $.each(data.result, function (index, file) {
                        var filename = decodeURI(file.url).replace("files/", "");
                        $this.add(filename, filename);
                    });
                }
            })
            .bind('fileuploadsubmit', function (e, data) {
                var fileTypes = $('#fileupload-' + contentkey).attr('accept'),
                    pattern,
                    ldata = $('#imagelist-' + contentkey + ' div.list').data('list');

                if (typeof fileTypes !== 'undefined') {
                    pattern = new RegExp("\\.(" + fileTypes.replace(/,/g, '|').replace(/\./g, '') + ")$", "i");
                    $.each(data.files , function (index, file) {
                        if (!pattern.test(file.name)) {
                            alert(ldata.message.wrongtype);
                            e.preventDefault();

                            return false;
                        }
                    });
                }
            });

        var lastClick = null;
        $holder.find('div.list').on('click', '.list-item', function (e) {
            if ($(e.target).hasClass('list-item')) {
                if (e.shiftKey) {
                    if (lastClick) {
                        var currentIndex = $(this).index(),
                            lastIndex = lastClick.index();

                        if (lastIndex > currentIndex) {
                            $(this).nextUntil(lastClick).add(this).add(lastClick).addClass('selected');
                        } else if (lastIndex < currentIndex) {
                            $(this).prevUntil(lastClick).add(this).add(lastClick).addClass('selected');
                        } else {
                            $(this).toggleClass('selected');
                        }
                    }
                } else if (e.ctrlKey || e.metaKey) {
                    $(this).toggleClass('selected');
                } else {
                    $holder.find('.list-item').not($(this)).removeClass('selected');
                    $(this).toggleClass('selected');
                }

                if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !$(this).hasClass('selected')) {
                    lastClick = null;
                } else {
                    lastClick = $(this);
                }
            }
        });

        $holder.find('.remove-selected-button').on('click', function (e) {
            var ldata = $holder.find('div.list').data('list');

            if (confirm(ldata.message.removeMulti)) {
                $holder.find('.selected').each(function () {
                    $this.remove($(this).data('id'), true);
                });
                $this.render();
            }
        });

        $holder.find('div.list').on('click', '.remove-button', function (e) {
            var ldata = $(this).closest('div.list').data('list');

            e.preventDefault();
            if (confirm(ldata.message.remove)) {
                $this.remove($(this).parent().data('id'));
            }
        });

        $holder.find("div.list").on('blur', 'input', function () {
            $this.doneSort();
        });

        // In the modal dialog, to navigate folders.
        $('#selectImageModal-' + contentkey).on('click', '.folder', function (e) {
            e.preventDefault();
            $('#selectImageModal-' + contentkey + ' .modal-content').load($(this).data('action'));
        });

        // In the modal dialog, to select a file.
        $('#selectImageModal-' + contentkey).on('click', '.file', function (e) {
            e.preventDefault();
            var filename = $(this).data('action');
            $this.add(filename, filename);
        });
    }

});
