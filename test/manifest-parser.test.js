import QUnit from 'qunit';
import {
  resolveMediaGroupUris,
  setupMediaPlaylist,
  setupMasterMediaPlaylists,
  parseManifest
} from '../src/manifest-parser.js';
import { urlTo } from './utils';
import manifests from './manifests';

QUnit.module('manifest-parser');

QUnit.test('resolveMediaGroupUris does nothing when no media groups', function(assert) {
  const master = {
    uri: 'master-uri',
    playlists: [],
    mediaGroups: []
  };

  resolveMediaGroupUris(master);
  assert.deepEqual(master, {
    uri: 'master-uri',
    playlists: [],
    mediaGroups: []
  }, 'does nothing when no media groups');
});

QUnit.test('resolveMediaGroupUris resolves media group URIs', function(assert) {
  const master = {
    uri: 'http://videojs.com/master.m3u8',
    playlists: [{
      attributes: { BANDWIDTH: 10 },
      uri: 'playlist-0'
    }],
    mediaGroups: {
      // CLOSED-CAPTIONS will never have a URI
      'CLOSED-CAPTIONS': {
        cc1: {
          English: {}
        }
      },
      'AUDIO': {
        low: {
          // audio doesn't need a URI if it is a label for muxed
          main: {},
          commentary: {
            uri: 'audio-low-commentary-uri'
          }
        },
        high: {
          main: {},
          commentary: {
            uri: 'audio-high-commentary-uri'
          }
        }
      },
      'SUBTITLES': {
        sub1: {
          english: {
            uri: 'subtitles-1-english-uri'
          },
          spanish: {
            uri: 'subtitles-1-spanish-uri'
          }
        },
        sub2: {
          english: {
            uri: 'subtitles-2-english-uri'
          },
          spanish: {
            uri: 'subtitles-2-spanish-uri'
          }
        },
        sub3: {
          english: {
            uri: 'subtitles-3-english-uri'
          },
          spanish: {
            uri: 'subtitles-3-spanish-uri'
          }
        }
      }
    }
  };

  resolveMediaGroupUris(master);

  assert.deepEqual(master, {
    uri: 'http://videojs.com/master.m3u8',
    playlists: [{
      attributes: { BANDWIDTH: 10 },
      uri: 'playlist-0'
    }],
    mediaGroups: {
      // CLOSED-CAPTIONS will never have a URI
      'CLOSED-CAPTIONS': {
        cc1: {
          English: {}
        }
      },
      'AUDIO': {
        low: {
          // audio doesn't need a URI if it is a label for muxed
          main: {},
          commentary: {
            uri: 'audio-low-commentary-uri',
            resolvedUri: 'http://videojs.com/audio-low-commentary-uri'
          }
        },
        high: {
          main: {},
          commentary: {
            uri: 'audio-high-commentary-uri',
            resolvedUri: 'http://videojs.com/audio-high-commentary-uri'
          }
        }
      },
      'SUBTITLES': {
        sub1: {
          english: {
            uri: 'subtitles-1-english-uri',
            resolvedUri: 'http://videojs.com/subtitles-1-english-uri'
          },
          spanish: {
            uri: 'subtitles-1-spanish-uri',
            resolvedUri: 'http://videojs.com/subtitles-1-spanish-uri'
          }
        },
        sub2: {
          english: {
            uri: 'subtitles-2-english-uri',
            resolvedUri: 'http://videojs.com/subtitles-2-english-uri'
          },
          spanish: {
            uri: 'subtitles-2-spanish-uri',
            resolvedUri: 'http://videojs.com/subtitles-2-spanish-uri'
          }
        },
        sub3: {
          english: {
            uri: 'subtitles-3-english-uri',
            resolvedUri: 'http://videojs.com/subtitles-3-english-uri'
          },
          spanish: {
            uri: 'subtitles-3-spanish-uri',
            resolvedUri: 'http://videojs.com/subtitles-3-spanish-uri'
          }
        }
      }
    }
  }, 'resolved URIs of certain media groups');
});

QUnit.test('setupMediaPlaylist sets attributes property if not set', function(assert) {
  const playlist = {};

  setupMediaPlaylist({ playlist });

  assert.deepEqual(playlist.attributes, {}, 'set empty object for attributes');
});

QUnit.test('setupMediaPlaylist does not overwrite attributes', function(assert) {
  const playlist = {
    attributes: {
      test: 1
    }
  };

  setupMediaPlaylist({ playlist });

  assert.deepEqual(playlist.attributes, { test: 1 }, 'did not overwrite attributes');
});

QUnit.test('setupMediaPlaylist defaults to id of 0', function(assert) {
  const playlist = {};

  setupMediaPlaylist({ playlist });

  assert.equal(playlist.id, 0, 'defaulted to id of 0');
});

QUnit.test('setupMediaPlaylist uses provided index as id', function(assert) {
  const playlist = {};

  setupMediaPlaylist({ playlist, index: 33 });

  assert.equal(playlist.id, 33, 'used provided index as id');
});

QUnit.test('setupMediaPlaylist does not set resolvedUri if no master URI', function(assert) {
  const playlist = {
    uri: 'test'
  };

  setupMediaPlaylist({ playlist });

  assert.notOk('resolvedUri' in playlist, 'did not set resolvedUri');
});

QUnit.test('setupMediaPlaylist resolves URI based on master URI', function(assert) {
  const playlist = {
    uri: 'test'
  };

  setupMediaPlaylist({ playlist, masterUri: 'http://test.com' });

  assert.equal(
    playlist.resolvedUri,
    'http://test.com/test',
    'set resolvedUri based on masterUri'
  );
});

QUnit.test('setupMasterMediaPlaylists does nothing if no playlists', function(assert) {
  const master = {
    playlists: []
  };

  setupMasterMediaPlaylists({
    playlists: master.playlists,
    masterUri: master.src
  });

  assert.deepEqual(master, {
    playlists: []
  }, 'master remains unchanged');
});

QUnit.test('setupMasterMediaPlaylists adds URI keys for each playlist', function(assert) {
  const master = {
    uri: 'http://videojs.com/master.m3u8',
    playlists: [{
      uri: 'uri-0'
    }, {
      uri: 'uri-1'
    }]
  };
  const expectedPlaylist0 = {
    attributes: {},
    resolvedUri: 'http://videojs.com/uri-0',
    uri: 'uri-0',
    id: 0
  };
  const expectedPlaylist1 = {
    attributes: {},
    resolvedUri: 'http://videojs.com/uri-1',
    uri: 'uri-1',
    id: 1
  };

  setupMasterMediaPlaylists({
    playlists: master.playlists,
    masterUri: master.uri
  });

  assert.deepEqual(master.playlists[0], expectedPlaylist0, 'retained playlist indices');
  assert.deepEqual(master.playlists[1], expectedPlaylist1, 'retained playlist indices');
  assert.deepEqual(master.playlists['uri-0'], expectedPlaylist0, 'added playlist key');
  assert.deepEqual(master.playlists['uri-1'], expectedPlaylist1, 'added playlist key');

  /*
  assert.equal(this.env.log.warn.calls, 2, 'logged two warnings');
  assert.equal(
    this.env.log.warn.args[0],
    'Invalid playlist STREAM-INF detected. Missing BANDWIDTH attribute.',
    'logged a warning'
  );
  assert.equal(
    this.env.log.warn.args[1],
    'Invalid playlist STREAM-INF detected. Missing BANDWIDTH attribute.',
    'logged a warning'
  );
  */
});

QUnit.test('setupMasterMediaPlaylists adds attributes objects if missing', function(assert) {
  const master = {
    uri: 'master-uri',
    playlists: [{
      uri: 'uri-0'
    }, {
      uri: 'uri-1'
    }]
  };

  setupMasterMediaPlaylists({
    playlists: master.playlists,
    masterUri: master.uri
  });

  assert.ok(master.playlists[0].attributes, 'added attributes object');
  assert.ok(master.playlists[1].attributes, 'added attributes object');

  /*
  assert.equal(this.env.log.warn.calls, 2, 'logged two warnings');
  assert.equal(
    this.env.log.warn.args[0],
    'Invalid playlist STREAM-INF detected. Missing BANDWIDTH attribute.',
    'logged a warning'
  );
  assert.equal(
    this.env.log.warn.args[1],
    'Invalid playlist STREAM-INF detected. Missing BANDWIDTH attribute.',
    'logged a warning'
  );
  */
});

QUnit.test('setupMasterMediaPlaylists resolves playlist URIs', function(assert) {
  const master = {
    uri: 'path/to/master-uri.m3u8',
    playlists: [{
      attributes: { BANDWIDTH: 10 },
      uri: 'uri-0'
    }, {
      attributes: { BANDWIDTH: 100 },
      uri: 'uri-1'
    }]
  };

  setupMasterMediaPlaylists({
    playlists: master.playlists,
    masterUri: master.uri
  });

  assert.equal(master.playlists[0].resolvedUri, urlTo('path/to/uri-0'), 'resolves URI');
  assert.equal(master.playlists[1].resolvedUri, urlTo('path/to/uri-1'), 'resolves URI');
});

QUnit.test('parses media manifest string into object', function(assert) {
  assert.deepEqual(
    parseManifest({
      manifestString: manifests.media,
      src: 'media.m3u8'
    }), {
      attributes: {},
      allowCache: true,
      uri: 'media.m3u8',
      endList: true,
      mediaSequence: 0,
      discontinuitySequence: 0,
      playlistType: 'VOD',
      targetDuration: 10,
      discontinuityStarts: [],
      id: 0,
      segments: [{
        duration: 10,
        timeline: 0,
        uri: 'media-00001.ts'
      }, {
        duration: 10,
        timeline: 0,
        uri: 'media-00002.ts'
      }, {
        duration: 10,
        timeline: 0,
        uri: 'media-00003.ts'
      }, {
        duration: 10,
        timeline: 0,
        uri: 'media-00004.ts'
      }]
    },
    'parsed media manifest string into correct object'
  );
});

QUnit.test('parses master manifest string into object', function(assert) {
  assert.deepEqual(
    parseManifest({
      manifestString: manifests.master,
      src: 'http://videojs.com/master.m3u8'
    }),
    {
      allowCache: true,
      discontinuityStarts: [],
      mediaGroups: {
        'AUDIO': {},
        'CLOSED-CAPTIONS': {},
        'SUBTITLES': {},
        'VIDEO': {}
      },
      uri: 'http://videojs.com/master.m3u8',
      segments: [],
      playlists: [{
        attributes: {
          'BANDWIDTH': 240000,
          'RESOLUTION': {
            width: 396,
            height: 224
          },
          'PROGRAM-ID': 1
        },
        id: 0,
        uri: 'media.m3u8',
        resolvedUri: 'http://videojs.com/media.m3u8',
        timeline: 0
      }, {
        attributes: {
          'BANDWIDTH': 40000,
          'PROGRAM-ID': 1
        },
        id: 1,
        uri: 'media1.m3u8',
        resolvedUri: 'http://videojs.com/media1.m3u8',
        timeline: 0
      }, {
        attributes: {
          'BANDWIDTH': 440000,
          'RESOLUTION': {
            width: 396,
            height: 224
          },
          'PROGRAM-ID': 1
        },
        id: 2,
        uri: 'media2.m3u8',
        resolvedUri: 'http://videojs.com/media2.m3u8',
        timeline: 0
      }, {
        attributes: {
          'BANDWIDTH': 1928000,
          'RESOLUTION': {
            width: 960,
            height: 540
          },
          'PROGRAM-ID': 1
        },
        id: 3,
        uri: 'media3.m3u8',
        resolvedUri: 'http://videojs.com/media3.m3u8',
        timeline: 0
      }]
    },
    'parsed master manifest string into correct object'
  );
});

QUnit.test('uses custom tag parsers and mappers', function(assert) {
  const manifestObject = parseManifest({
    manifestString: manifests.media,
    src: 'media.m3u8',
    // Zen total duration is provided in the media manifest, i.e.,
    // #ZEN-TOTAL-DURATION:57.9911
    customTagMappers: [{
      expression: /^#ZEN-TOTAL-DURATION/,
      map(line) {
        return `#TOTAL-DURATION:${parseFloat(line.split(':')[1])}`;
      }
    }],
    customTagParsers: [{
      expression: /#TOTAL-DURATION/,
      customType: 'totalDuration',
      dataParser(line) {
        return parseFloat(line.split(':')[1]);
      }
    }]
  });

  assert.deepEqual(
    manifestObject.custom,
    { totalDuration: 57.9911 },
    'used custom tag parsers and mappers'
  );
});
