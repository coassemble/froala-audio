(function($, _) {
  'use strict';
  $.extend($.FE.POPUP_TEMPLATES, {
    'audio.insert': '[_BUTTONS_][_BY_URL_LAYER_][_UPLOAD_LAYER_][_PROGRESS_BAR_]',
    'audio.edit': '[_BUTTONS_]'
  });
  $.extend($.FE.DEFAULTS, {
    audioAllowedTypes: ['mp3', 'mpeg', 'x-m4a'],
    audioEditButtons: ['audioReplace', 'audioRemove', '|', 'audioAutoplay', 'audioAlign'],
    audioInsertButtons: ['audioBack', '|', 'audioByURL', 'audioUpload'],
    audioMove: true,
    audioSplitHTML: false,
    audioUpload: true,
    audioUploadMethod: 'POST',
    audioUploadParam: 'file',
    audioUploadParams: {},
    audioUploadURL: 'https://i.froala.com/upload'
  });

  $.FE.PLUGINS.audio = function(editor) {
    const MISSING_LINK = 1;
    const ERROR_DURING_UPLOAD = 2;
    const BAD_RESPONSE = 4;
    const BAD_FILE_TYPE = 8;

    const errorMessages = {
      [MISSING_LINK]: 'No link in upload response.',
      [ERROR_DURING_UPLOAD]: 'Error during file upload.',
      [BAD_RESPONSE]: 'Parsing response failed.',
      [BAD_FILE_TYPE]: 'Unsupported file type - please provide an audio file.',
    };

    let currentAudio = null;

    const stopEditing = function(audio) {
      if (!audio) audio = editor.$el.find('.fr-audio');
      if (!audio.length) return;
      editor.toolbar.enable();
      audio.removeClass('fr-active');
      currentAudio = null;
    };

    const bindInsertEvents = function($popup) {
      // Drag over the droppable area.
      editor.events.$on($popup, 'dragover dragenter', '.fr-audio-upload-layer', function() {
        $(this).addClass('fr-drop');
        return false;
      }, true);

      // Drag end.
      editor.events.$on($popup, 'dragleave dragend', '.fr-audio-upload-layer', function() {
        $(this).removeClass('fr-drop');
        return false;
      }, true);

      // Drop.
      editor.events.$on($popup, 'drop', '.fr-audio-upload-layer', function(e) {
        e.preventDefault();
        e.stopPropagation();

        $(this).removeClass('fr-drop');

        const dt = e.originalEvent.dataTransfer;

        if (dt && dt.files) {
          const inst = $popup.data('instance') || editor;
          inst.events.disableBlur();
          inst.audio.upload(dt.files);
          inst.events.enableBlur();
        }
      }, true);

      if (editor.helpers.isIOS()) {
        editor.events.$on($popup, 'touchstart', '.fr-audio-upload-layer input[type="file"]', function() {
          $(this).trigger('click');
        }, true);
      }

      editor.events.$on($popup, 'change', '.fr-audio-upload-layer input[type="file"]', function() {
        if (this.files) {
          const inst = $popup.data('instance') || editor;
          inst.events.disableBlur();
          $popup.find('input:focus').blur();
          inst.events.enableBlur();
          inst.audio.upload(this.files);
        }

        // Else IE 9 case.
        // Chrome fix.
        $(this).val('');
      }, true);
    };

    const refreshInsertPopup = function() {
      const $popup = editor.popups.get('audio.insert');
      const $inputs = $popup.find('input, button');
      $inputs.prop('disabled', false).val('').trigger('change');
    };

    /* eslint-disable camelcase */
    const initInsertPopup = function() {
      editor.popups.onRefresh('audio.insert', refreshInsertPopup);
      editor.popups.onHide('audio.insert', editor.audio.hideProgressBar);

      let buttonSpec = editor.opts.audioInsertButtons;
      if (!editor.opts.audioUpload) buttonSpec = _.omit(buttonSpec, 'audioUpload');
      const buttons = buttonSpec.length < 2 ? '' : `<div class="fr-buttons">
                ${editor.button.buildList(buttonSpec)}
            </div>`;

      const by_url_layer = `<div class="fr-audio-by-url-layer fr-layer" id="fr-audio-by-url-layer-${editor.id}">
                <div class="fr-input-line">
                    <input id="fr-audio-by-url-layer-text-${editor.id}" type="text" placeholder="${editor.language.translate('Paste in an audio URL')}" tabIndex="1" aria-required="true" />
                </div>
                <div class="fr-action-buttons">
                    <button type="button" class="fr-command fr-submit" data-cmd="audioInsertByURL" tabIndex="2" role="button">${editor.language.translate('Insert')}</button>
                </div>
            </div>`;

      const accept = editor.opts.audioAllowedTypes.map(t => 'audio/' + t).join(',');
      const upload_layer = `<div class="fr-audio-upload-layer fr-file-upload-layer fr-layer" id="fr-audio-upload-layer-${editor.id}">
                <strong>${editor.language.translate('Drop audio')}</strong><br />(${editor.language.translate('or click')})
                <div class="fr-form">
                    <input type="file" accept="${accept}" tabIndex="-1" aria-labelledby="fr-audio-upload-layer-${editor.id}" role="button" />
                </div>
            </div>`;

      const progress_bar = `<div class="fr-audio-progress-bar-layer fr-layer">
                <h3 tabIndex="-1" class="fr-message">${editor.language.translate('Uploading')}</h3>
                <div class="fr-loader">
                    <span class="fr-progress"></span>
                </div>
                <div class="fr-action-buttons">
                    <button type="button" class="fr-command fr-dismiss" data-cmd="audioDismissError" tabIndex="2" role="button">
                        ${editor.language.translate('OK')}
                    </button>
                </div>
            </div>`;

      const $popup = editor.popups.create('audio.insert', {buttons, by_url_layer, upload_layer, progress_bar});
      bindInsertEvents($popup);
      return $popup;
    };

    const initEditPopup = function() {
      const buttonSpec = editor.opts.audioEditButtons;
      const buttons = buttonSpec.length < 1 ? '' : `<div class="fr-buttons">
                ${editor.button.buildList(buttonSpec)}
            </div>`;
      return editor.popups.create('audio.edit', {buttons});
    };
    /* eslint-enable camelcase */

    const showProgressBar = function(message) {
      const $popup = editor.popups.get('audio.insert') || initInsertPopup();

      $popup.find('.fr-layer.fr-active').removeClass('fr-active').addClass('fr-pactive');
      $popup.find('.fr-audio-progress-bar-layer').addClass('fr-active');
      $popup.find('.fr-buttons').hide();

      if (message) showProgressMessage(message, 0);
    };


    const showErrorMessage = function(message) {
      showProgressBar();
      const $popup = editor.popups.get('audio.insert');
      const $layer = $popup.find('.fr-audio-progress-bar-layer');
      $layer.addClass('fr-error');
      const $messageHeader = $layer.find('h3');
      $messageHeader.text(editor.language.translate(message));
      editor.events.disableBlur();
      $messageHeader.focus();
    };

    const throwError = function(code, response) {
      editor.edit.on();
      showErrorMessage(errorMessages[code]);
      editor.events.trigger('audio.error', [{code, message: errorMessages[code]}, response]);
    };

    const showProgressMessage = function(message, progress) {
      const $popup = editor.popups.get('audio.insert');
      if (!$popup) return;

      const $layer = $popup.find('.fr-audio-progress-bar-layer');
      $layer.find('h3').text(editor.language.translate(message) + (progress ? ' ' + progress + '%' : ''));
      $layer.removeClass('fr-error');

      if (progress) {
        $layer.find('div').removeClass('fr-indeterminate');
        $layer.find('div > span').css('width', progress + '%');
      } else {
        $layer.find('div').addClass('fr-indeterminate');
      }
    };

    const parseResponse = function(response) {
      if (editor.events.trigger('audio.uploaded', [response], true) === false) {
        editor.edit.on();
        return false;
      }

      const res = JSON.parse(response);
      if (res.link) return res;
      throwError(MISSING_LINK, response);
      return false;
    };

    const addNewAudio = function(src, response) {
      const data = parseResponse(response) || {};
      const $audio = $('<span contenteditable="false" draggable="true" class="fr-audio fr-uploading">' +
                '<audio controls="controls" controlsList="nodownload"></audio>' +
            '</span>');
      $audio.toggleClass('fr-draggable', editor.opts.audioMove);

      editor.events.focus(true);
      editor.selection.restore();

      editor.undo.saveStep();

      if (editor.opts.audioSplitHTML) {
        editor.markers.split();
      } else {
        editor.markers.insert();
      }

      editor.html.wrap();
      const $marker = editor.$el.find('.fr-marker');

      // Do not insert audio inside emoticon.
      if (editor.node.isLastSibling($marker) && $marker.parent().hasClass('fr-deletable')) {
        $marker.insertAfter($marker.parent());
      }

      $marker.replaceWith($audio);
      editor.selection.clear();

      const player = $audio.find('audio');
      player
        .text(editor.language.translate('Your browser does not support HTML5 audio.'))
        .on('canplaythrough loadeddata', function() {
          editor.popups.hide('audio.insert');
          $audio.removeClass('fr-uploading');
          editor.events.trigger('audio.loaded', [$audio]);
        })
        .on('error', function(e) {
          editor.popups.hide('audio.insert');
          $audio.addClass('fr-error').removeClass('fr-uploading');
          editor.events.trigger('audio.error', [$audio, e]);
        })
        .attr(_.mapKeys(data, (v, k) => 'data-' + _.kebabCase(k)))
        .attr({src});

      return $audio;
    };

    const replaceAudio = function($audio, src) {
      const player = $audio.find('audio');
      // If you try to replace it with itself, we clear the src first so that the events still fire.
      if (player.attr('src') === src) player.attr({src: ''});

      $audio.addClass('fr-uploading');
      player
        .off('canplaythrough loadeddata')
        .off('error')
        .on('canplaythrough loadeddata', function() {
          editor.popups.hide('audio.insert');
          $audio.removeClass('fr-uploading');
          editor.events.trigger('audio.loaded', [$audio]);
          stopEditing($audio);
        })
        .on('error', function(e) {
          $audio.addClass('fr-error').removeClass('fr-uploading');
          editor.audio.showEditPopup($audio);
          editor.events.trigger('audio.error', [$audio, e]);
        })
        .attr({src});
      return $audio;
    };

    const insertHtmlAudio = function(link, response) {
      editor.edit.on();
      showProgressMessage('Loading audio');
      showProgressBar('Loading audio');

      const replace = !!currentAudio;
      const $audio = replace ? replaceAudio(currentAudio, link) : addNewAudio(link, response);

      editor.undo.saveStep();
      editor.events.trigger(replace ? 'audio.replaced' : 'audio.inserted', [$audio, response]);
    };

    let touchScroll = false;
    const editAudio = function(e) {
      const $audio = $(this);
      if (touchScroll && e && e.type === 'touchend') {
        return true;
      }
      if (editor.edit.isDisabled()) {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        return false;
      }
      editor.toolbar.disable();

      // Hide keyboard.
      if (editor.helpers.isMobile()) {
        editor.events.disableBlur();
        editor.$el.blur();
        editor.events.enableBlur();
      }

      if (currentAudio) currentAudio.removeClass('fr-active');
      currentAudio = $audio;
      $audio.addClass('fr-active');

      if (editor.opts.iframe) editor.size.syncIframe();
      editor.audio.showEditPopup($audio);

      editor.selection.clear();
      const range = editor.doc.createRange();
      range.selectNode($audio[0]);
      editor.selection.get().addRange(range);

      editor.button.bulkRefresh();
      return true;
    };

    return {
      _init() {
        if (editor.helpers.isMobile()) {
          editor.events.$on(editor.$el, 'touchstart', 'span.fr-audio', function() {
            touchScroll = false;
          });

          editor.events.$on(editor.$el, 'touchmove', function() {
            touchScroll = true;
          });
        }
        editor.events.$on(editor.$el, 'mousedown', 'span.fr-audio', function(e) {
          e.stopPropagation();
        });
        editor.events.$on(editor.$el, 'click touchend', 'span.fr-audio', editAudio);
        editor.events.on('mouseup window.mouseup', () => stopEditing());
        editor.events.on('commands.mousedown', function($btn) {
          if ($btn.parents('.fr-toolbar').length) stopEditing();
        });
      },
      showInsertPopup() {
        if (!editor.popups.get('audio.insert')) initInsertPopup();

        // Find the first button and show its associated layer.
        editor.opts.audioInsertButtons.some(function(b) {
          if (b === 'audioByURL') {
            editor.audio.showLayer('audio-by-url');
            return true;
          }
          if (b === 'audioUpload') {
            editor.audio.showLayer('audio-upload');
            return true;
          }
          return false;
        });
      },
      showEditPopup($audio) {
        const $popup = 'audio.edit';
        if (!editor.popups.get($popup)) initEditPopup();
        editor.popups.setContainer($popup, editor.$sc);
        editor.popups.refresh($popup);

        const $player = $audio.find('audio');
        const {left, top} = $player.offset();
        const height = $player.outerHeight();

        editor.popups.show($popup, left + $player.outerWidth() / 2, top + height, height);
      },

      refreshByURLButton($btn) {
        const $popup = editor.popups.get('audio.insert');
        if ($popup.find('.fr-audio-by-url-layer').hasClass('fr-active')) {
          $btn.addClass('fr-active').attr('aria-pressed', true);
        }
      },
      refreshUploadButton($btn) {
        const $popup = editor.popups.get('audio.insert');
        if ($popup.find('.fr-audio-upload-layer').hasClass('fr-active')) {
          $btn.addClass('fr-active').attr('aria-pressed', true);
        }
      },

      autoplay() {
        if (!currentAudio) return false;
        const $player = currentAudio.find('audio');
        const isAuto = $player.prop('autoplay');
        $player.prop({autoplay: !isAuto});
      },
      align(val) {
        if (!currentAudio) return false;
        // Center is the default, so just clear the alignment if that's what was requested.
        if (val === 'center') val = '';
        currentAudio.css({textAlign: val});
        // Changing the alignment will almost certainly move the actual audio player away from the edit popup,
        // so we re-display the popup to get them back in sync.
        editor.audio.showEditPopup(currentAudio);
      },

      refreshAutoplayButton($btn) {
        if (!currentAudio) return false;
        const isAuto = currentAudio.find('audio').prop('autoplay');
        $btn.toggleClass('fr-active', isAuto).attr('aria-pressed', isAuto);
      },
      refreshAlignButton($btn) {
        if (!currentAudio) return false;
        const align = currentAudio.css('textAlign') || 'center';
        // This is copied from how the video plugin does it. Yes, it's gross.
        $btn.children(':first').replaceWith(editor.icon.create('audioAlign' + _.capitalize(align)));
      },
      refreshAlignDropdown($btn, $dropdown) {
        if (!currentAudio) return;
        const align = currentAudio.css('textAlign') || 'center';
        $dropdown.find(`.fr-command[data-param1="${align}"]`).addClass('fr-active').attr('aria-selected', true);
      },

      back() {
        if (currentAudio) {
          editor.audio.showEditPopup(currentAudio);
        } else {
          editor.events.disableBlur();
          editor.selection.restore();
          editor.events.enableBlur();

          editor.popups.hide('audio.insert');
          editor.toolbar.showInline();
        }
      },
      refreshBackButton($btn) {
        const showBack = currentAudio || editor.opts.toolbarInline;
        $btn.toggleClass('fr-hidden', !showBack);
        $btn.next('.fr-separator').toggleClass('fr-hidden', !showBack);
      },

      showLayer(name) {
        const $popup = editor.popups.get('audio.insert');
        editor.popups.setContainer('audio.insert', currentAudio ? editor.$sc : editor.$tb);

        let left, top, height = 0;
        if (currentAudio) {
          const $player = currentAudio.find('audio');
          height = $player.outerHeight();

          const offset = $player.offset();
          left = offset.left + $player.width() / 2;
          top = offset.top + height;
        } else if (editor.opts.toolbarInline) {
          // Set top to the popup top.
          top = $popup.offset().top - editor.helpers.getPX($popup.css('margin-top'));

          // If the popup is above apply height correction.
          if ($popup.hasClass('fr-above')) top += $popup.outerHeight();
        } else {
          const $btn = editor.$tb.find('.fr-command[data-cmd="insertAudio"]');
          const offset = $btn.offset();
          left = offset.left + $btn.outerWidth() / 2;
          top = offset.top + (editor.opts.toolbarBottom ? 10 : $btn.outerHeight() - 10);
        }

        // Show the new layer.
        $popup.find('.fr-layer').removeClass('fr-active');
        $popup.find('.fr-' + name + '-layer').addClass('fr-active');
        editor.popups.show('audio.insert', left, top, height);
        editor.accessibility.focusPopup($popup);
        editor.popups.refresh('audio.insert');
      },

      hideProgressBar(dismiss) {
        const $popup = editor.popups.get('audio.insert');
        if (!$popup) return;

        $popup.find('.fr-layer.fr-pactive').addClass('fr-active').removeClass('fr-pactive');
        $popup.find('.fr-audio-progress-bar-layer').removeClass('fr-active');
        $popup.find('.fr-buttons').show();

        // Dismiss error message.
        const audios = editor.$el.find('audio.fr-error');
        if (dismiss || audios.length) {
          editor.events.focus();

          if (audios.length) {
            audios.parent().remove();
            editor.undo.saveStep();
            editor.undo.run();
            editor.undo.dropRedo();
          }

          editor.popups.hide('audio.insert');
        }
      },

      insertByURL(link) {
        if (!link) {
          const $popup = editor.popups.get('audio.insert');
          link = ($popup.find('.fr-audio-by-url-layer input[type="text"]').val() || '').trim();
          $popup.find('input, button').prop({disabled: true});
        }

        if (!/^http/.test(link)) link = 'https://' + link;
        insertHtmlAudio(link);
      },
      upload(audios) {
        // Make sure we have what to upload.
        if (!(audios && audios.length)) return false;

        // Check if we should cancel the upload.
        if (editor.events.trigger('audio.beforeUpload', [audios]) === false) return false;

        const audio = audios[0];

        if (!_.includes(editor.opts.audioAllowedTypes, audio.type.replace(/audio\//g, ''))) {
          throwError(BAD_FILE_TYPE);
          return false;
        }

        if (!editor.drag_support.formdata) return false;

        const formData = new FormData();
        _.each(editor.opts.audioUploadParams, (key, value) => formData.append(key, value));
        formData.append(editor.opts.audioUploadParam, audio);

        const url = editor.opts.audioUploadURL;
        const xhr = editor.core.getXHR(url, editor.opts.audioUploadMethod);

        // Set upload events.
        xhr.onload = function() {
          showProgressMessage('Loading audio');

          const {status, response, responseText} = this;
          if (status === 415) {
            throwError(BAD_FILE_TYPE, JSON.parse(responseText));
            return;
          }
          if (status < 200 || status >= 300) {
            throwError(ERROR_DURING_UPLOAD, response || responseText);
            return;
          }

          try {
            const resp = parseResponse(response);
            if (resp) insertHtmlAudio(resp.link, responseText);
          } catch (ex) {
            // Bad response.
            throwError(BAD_RESPONSE, response || responseText);
          }
        };

        xhr.onerror = function() {
          throwError(BAD_RESPONSE, this.response || this.responseText || this.responseXML);
        };

        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) showProgressMessage('Uploading', (e.loaded / e.total * 100 | 0));
        };

        xhr.onabort = function() {
          editor.edit.on();
          editor.audio.hideProgressBar(true);
        };

        showProgressBar();
        editor.events.disableBlur();
        editor.edit.off();
        editor.events.enableBlur();

        const $popup = editor.popups.get('audio.insert');
        if ($popup) {
          $popup.off('abortUpload').on('abortUpload', function() {
            if (xhr.readyState !== 4) xhr.abort();
          });
        }

        // Send data.
        xhr.send(formData);
        return true;
      },

      replace() {
        if (!currentAudio) return;
        editor.audio.showInsertPopup();
      },

      remove() {
        if (!currentAudio) return;
        const $audio = currentAudio;
        if (editor.events.trigger('audio.beforeRemove', [$audio]) === false) return;
        editor.popups.hideAll();

        const el = $audio[0];
        editor.selection.setBefore(el) || editor.selection.setAfter(el);
        $audio.remove();
        editor.selection.restore();

        editor.html.fillEmptyBlocks();
        editor.events.trigger('audio.removed', [$audio]);
        stopEditing($audio);
      }
    };
  };

  $.FE.DefineIcon('insertAudio', {NAME: 'volume-up'});
  $.FE.RegisterCommand('insertAudio', {
    title: 'Insert Audio',
    undo: false,
    focus: true,
    refreshAfterCallback: false,
    popup: true,
    callback() {
      if (!this.popups.isVisible('audio.insert')) return this.audio.showInsertPopup();
      if (this.$el.find('.fr-marker').length) {
        this.events.disableBlur();
        this.selection.restore();
      }
      return this.popups.hide('audio.insert');
    },
    plugin: 'audio'
  });

  $.FE.DefineIcon('audioByURL', {NAME: 'link'});
  $.FE.RegisterCommand('audioByURL', {
    title: 'By URL',
    undo: false,
    focus: false,
    toggle: true,
    callback() {
      this.audio.showLayer('audio-by-url');
    },
    refresh($btn) {
      this.audio.refreshByURLButton($btn);
    }
  });

  $.FE.DefineIcon('audioUpload', {NAME: 'upload'});
  $.FE.RegisterCommand('audioUpload', {
    title: 'Upload Audio',
    undo: false,
    focus: false,
    toggle: true,
    callback() {
      this.audio.showLayer('audio-upload');
    },
    refresh($btn) {
      this.audio.refreshUploadButton($btn);
    }
  });

  $.FE.RegisterCommand('audioDismissError', {
    title: 'OK',
    undo: false,
    callback() {
      this.audio.hideProgressBar(true);
    }
  });

  $.FE.RegisterCommand('audioInsertByURL', {
    undo: true,
    focus: true,
    callback() {
      this.audio.insertByURL();
    }
  });

  $.FE.DefineIcon('audioAlignLeft', { NAME: 'align-left' });
  $.FE.DefineIcon('audioAlignRight', { NAME: 'align-right' });
  // For consistency with the video plugin, we use the align-justify icon for alignCenter. :(
  $.FE.DefineIcon('audioAlignCenter', { NAME: 'align-justify' });

  $.FE.DefineIcon('audioAlign', { NAME: 'align-center' });
  $.FE.RegisterCommand('audioAlign', {
    type: 'dropdown',
    title: 'Align',
    options: {
      left: 'Align Left',
      center: 'None',
      right: 'Align Right'
    },
    html() {
      const mkOption = (label, val) => `<li role="presentation">
                <a class="fr-command fr-title" tabIndex="-1" role="option" data-cmd="audioAlign"
                   data-param1="${val}" title="${this.language.translate(label)}">
                    ${this.icon.create('audioAlign' + _.capitalize(val))}
                    <span class="fr-sr-only">${this.language.translate(label)}</span>
                </a>
            </li>`;

      return `<ul class="fr-dropdown-list" role="presentation">
                ${_.map($.FE.COMMANDS.audioAlign.options, mkOption).join('\n')}
            </ul>`;
    },
    callback(cmd, val) {
      this.audio.align(val);
    },
    refresh($btn) {
      this.audio.refreshAlignButton($btn);
    },
    refreshOnShow($btn, $dropdown) {
      this.audio.refreshAlignDropdown($btn, $dropdown);
    }
  });

  $.FE.DefineIcon('audioAutoplay', {NAME: 'play-circle'});
  $.FE.RegisterCommand('audioAutoplay', {
    title: 'Autoplay',
    toggle: true,
    callback() {
      this.audio.autoplay();
    },
    refresh($btn) {
      this.audio.refreshAutoplayButton($btn);
    }
  });

  $.FE.DefineIcon('audioReplace', {NAME: 'exchange'});
  $.FE.RegisterCommand('audioReplace', {
    title: 'Replace',
    undo: false,
    focus: false,
    popup: true,
    refreshAfterCallback: false,
    callback() {
      this.audio.replace();
    }
  });

  $.FE.DefineIcon('audioRemove', {NAME: 'trash'});
  $.FE.RegisterCommand('audioRemove', {
    title: 'Remove',
    callback() {
      this.audio.remove();
    }
  });

  $.FE.DefineIcon('audioBack', { NAME: 'arrow-left' });
  $.FE.RegisterCommand('audioBack', {
    title: 'Back',
    undo: false,
    focus: false,
    back: true,
    callback() {
      this.audio.back();
    },
    refresh($btn) {
      this.audio.refreshBackButton($btn);
    }
  });

  if (!$.FE.RegisterQuickInsertButton) return;
  $.FE.RegisterQuickInsertButton('audio', {
    icon: 'insertAudio',
    requiredPlugin: 'audio',
    title: 'Insert Audio',
    undo: false,
    callback() {
      const src = prompt(this.language.translate('Paste the URL of the audio you want to insert.'));
      if (src) this.audio.insertByURL(src);
    }
  });
})(window.jQuery, window._);
