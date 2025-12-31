/* js/admin.js */
jQuery(document).ready(function ($) {
    // ---------------------------------------------------------
    // Copy Shortcode Button
    // ---------------------------------------------------------
    $('.edel-copy-btn').on('click', function (e) {
        e.preventDefault();
        var code = $(this).data('code');
        var $btn = $(this);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(
                function () {
                    showCopied($btn);
                },
                function (err) {
                    alert('Press Ctrl+C to copy');
                }
            );
        } else {
            var $temp = $('<input>');
            $('body').append($temp);
            $temp.val(code).select();
            document.execCommand('copy');
            $temp.remove();
            showCopied($btn);
        }
    });

    function showCopied($btn) {
        if ($btn.next('#edel-copy-msg').length) {
            $btn.next('#edel-copy-msg').fadeIn().delay(1000).fadeOut();
        } else {
            var originalText = $btn.html();
            // edel_admin_vars is localized from PHP
            $btn.text(edel_admin_vars.copied_msg);
            setTimeout(function () {
                $btn.html(originalText);
            }, 1500);
        }
    }

    // ---------------------------------------------------------
    // Texture Uploader
    // ---------------------------------------------------------
    var textureFrame;
    $('.edel-upload-texture').on('click', function (e) {
        e.preventDefault();
        var targetId = $(this).data('target');
        if (textureFrame) {
            textureFrame.targetId = targetId;
            textureFrame.open();
            return;
        }

        textureFrame = wp.media({
            title: edel_admin_vars.select_texture_title,
            button: {
                text: edel_admin_vars.use_image_btn
            },
            multiple: false,
            library: {
                type: 'image'
            }
        });
        textureFrame.targetId = targetId;
        textureFrame.on('select', function () {
            var attachment = textureFrame.state().get('selection').first().toJSON();
            $('#' + textureFrame.targetId).val(attachment.url);
        });
        textureFrame.open();
    });

    // ---------------------------------------------------------
    // Artwork Picker Modal
    // ---------------------------------------------------------
    var targetInputId = null;
    var $modal = $('#edel-art-picker-modal');

    $('.edel-open-picker').on('click', function () {
        targetInputId = $(this).data('target');
        var $targetInput = $('#' + targetInputId);
        var val = $targetInput.val();

        var currentIds = val
            ? val.split(',').map(function (s) {
                  return s.trim();
              })
            : [];

        var usedIds = [];
        $('.edel-placement-input').each(function () {
            if ($(this).attr('id') !== targetInputId) {
                var v = $(this).val();
                if (v) {
                    var parts = v.split(',');
                    parts.forEach(function (s) {
                        if (s.trim()) usedIds.push(s.trim());
                    });
                }
            }
        });

        $('.edel-art-item').each(function () {
            var $item = $(this);
            var id = String($item.data('id'));
            var hasImg = $item.data('has-img') == 1;

            $item.removeClass('selected disabled hidden');

            if (!hasImg) {
                $item.addClass('hidden');
                return;
            }

            if (currentIds.indexOf(id) !== -1) {
                $item.addClass('selected');
            } else if (usedIds.indexOf(id) !== -1) {
                $item.addClass('disabled');
            }
        });

        $modal.show();
    });

    $('#edel-picker-close').on('click', function () {
        $modal.hide();
    });
    $modal.on('click', function (e) {
        if (e.target === this) $modal.hide();
    });

    $('.edel-art-item').on('click', function () {
        if ($(this).hasClass('disabled') || $(this).hasClass('hidden')) return;
        $(this).toggleClass('selected');
        var ids = [];
        $('.edel-art-item.selected:not(.hidden)').each(function () {
            ids.push($(this).data('id'));
        });
        $('#' + targetInputId).val(ids.join(', '));
    });
});
