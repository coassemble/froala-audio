# froala-audio

A simple plugin for [Froala WYSIWYG Editor](https://www.froala.com/wysiwyg-editor/) that allows users to insert and customise audio players in the editor.

## Prerequisites

The following libraries must be available for this plugin to function correctly:

* Froala Editor >= 2.0.0 (developed under 2.7.5)
* Lodash >= 3.0.0, including Lodash 4 (developed under 3.10.1)

## Installing

Add `froala-audio` to your package.json:
```bash
npm install --save froala-audio
# or
yarn add froala-audio
```

Then load the files froala-audio.js and froala-audio.css on your page:
```html
<!-- anywhere on the page -->
<link rel="stylesheet" src="/node_modules/froala-audio/froala-audio.css" />

<!-- after loading froala core -->
<script src="/node_modules/froala-audio/froala-audio.js"></script>
```

In your Froala configuration, add the `audio` plugin to the list of enabled plugins. Then you can add `insertAudio` to any of the toolbars, or `audio` to the Quick Insert buttons, or both:
```javascript
const froalaConfig = {
  pluginsEnabled: ['image', 'video', 'audio', ...],
  toolbarButtons: ['insertAudio', '|', 'insertVideo', ...],
  quickInsertButtons: ['audio', 'video', ...],
  ...
};
```

## Configuration

froala-audio supports many of the same configuration options that the core video plugin does. Here are the recognised options:

### `audioAllowedTypes`

**Type:** `[String]`
**Default:** `['mp3', 'mpeg', 'x-m4a']` 

The list of audio MIME types that are allowed to be uploaded, without the leading `audio/`. While browsers will prevent other types from being uploaded, this restriction is easy to dodge - so we strongly recommend that you check the type on the server as well.

### `audioEditButtons`

**Type:** `[String]`
**Default:** `['audioReplace', 'audioRemove', '|', 'audioAlign']`

The buttons that appear in the edit-audio popup when an audio player is selected. Adding different buttons to this list is unlikely to work well, but you may remove unwanted buttons without any trouble.

### `audioInsertButtons`

**Type:** `[String]`
**Default:** `['audioBack', '|', 'audioByURL', 'audioUpload']`

The buttons that appear in the insert-audio popup when the audio button is clicked in a toolbar. These buttons function like tabs, toggling between the different possible ways to insert an audio clip. Again, adding new buttons is unlikely to work well, but you may remove unwanted ones.

### `audioMove`

**Type:** `Boolean`
**Default:** `true`

Allows changing the position of audio players in the content by dragging them.

### `audioSplitHTML`

**Type:** `Boolean`
**Default:** `false`

Allows a new audio player to split apart existing HTML when it is inserted. Not recommended.

### `audioUpload`

**Type:** `Boolean`
**Default:** `true`

Whether uploading audio clips is allowed. If set to `false`, then the audio-upload option will not be displayed at all.

There are four more options relating to audio upload: `audioUploadMethod`, `audioUploadParam`, `audioUploadParams`, and `audioUploadURL`. They all function identically to the corresponding parameters from Froala core plugins.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/ecoach-lms/froala-audio/tags). 

## Authors

* **Danielle McLean** - [00dani](https://github.com/00dani)

See also the list of [contributors](https://github.com/ecoach-lms/froala-audio/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
