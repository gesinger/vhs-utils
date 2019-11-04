import { Parser as M3u8Parser } from 'm3u8-parser';
import { parse as parseMpd } from 'mpd-parser';
import resolveUrl from './resolve-url';

/**
 * Adds `resolvedUri` properties alongside other `uri` properties in the provided segment.
 *
 * @param {Object} segment
 *        The segment to add `resolvedUri` properties to
 * @param {string} baseUri
 *        The URI to base the segment's URI off of for relative paths
 */
export const resolveSegmentUris = (segment, baseUri) => {
  if (!segment.resolvedUri) {
    segment.resolvedUri = resolveUrl(baseUri, segment.uri);
  }
  if (segment.key && !segment.key.resolvedUri) {
    segment.key.resolvedUri = resolveUrl(baseUri, segment.key.uri);
  }
  if (segment.map && !segment.map.resolvedUri) {
    segment.map.resolvedUri = resolveUrl(baseUri, segment.map.uri);
  }
};

/**
 * Loops through all supported media groups in master and calls the provided
 * callback for each group
 *
 * @param {Object} master
 *        The parsed master manifest object
 * @param {Function} callback
 *        Callback to call for each media group
 */
export const forEachMediaGroup = (master, callback) => {
  ['AUDIO', 'SUBTITLES'].forEach((mediaType) => {
    for (const groupKey in master.mediaGroups[mediaType]) {
      for (const labelKey in master.mediaGroups[mediaType][groupKey]) {
        const mediaProperties = master.mediaGroups[mediaType][groupKey][labelKey];

        callback(mediaProperties, mediaType, groupKey, labelKey);
      }
    }
  });
};

/**
 * Adds the `resolvedUri` property alongside the `uri` property in any found media group.
 *
 * @param {Object} master
 *        The master playlist
 */
export const resolveMediaGroupUris = (master) => {
  forEachMediaGroup(master, (properties) => {
    if (properties.uri) {
      properties.resolvedUri = resolveUrl(master.uri, properties.uri);
    }
  });
};

/*
 * Adds properties expected by VHS for consistency. For instance, m3u8-parser doesn't add
 * an attributes object to media playlists that aren't a part of a master playlist. This
 * function will add an empty object, if one is not provided, to allow VHS' code to assume
 * media playlists maintain a consistent structure, whether the original source was a
 * master or media playlist,
 *
 * @param {Object} config
 *        Arguments object
 * @param {Object} config.playlist
 *        The media playlist
 * @param {string} [config.masterUri]
 *        URI of the master playlist containing the media playlist (if applicable)
 * @param {number} [config.index=0]
 *        Index of the media playlist within the master object's playlists array (if
 *        applicable)
 */
export const setupMediaPlaylist = ({ playlist, masterUri, index = 0 }) => {
  // For media playlist sources, the URI is resolved at the time of the response (to
  // handle redirects), therefore, only media playlists within a master must be resolved
  // here.
  if (masterUri) {
    playlist.resolvedUri = resolveUrl(masterUri, playlist.uri);
  }
  playlist.id = index;

  // Although the spec states an #EXT-X-STREAM-INF tag MUST have a
  // BANDWIDTH attribute, we can play the stream without it. This means a poorly
  // formatted master playlist may not have an attributes list. An attributes
  // property is added here to prevent undefined references when we encounter
  // this scenario.
  //
  // In addition, m3u8-parser does not attach an attributes property to media
  // playlists so make sure that the property is attached to avoid the same undefined
  // reference errors.
  playlist.attributes = playlist.attributes || {};
};

/*
 * For a consistent object schema, add properties expected by VHS to the media playlists
 * within a master manifest.
 *
 * Also logs warnings if any issues are seen with the playlists.
 *
 * @param {Object} config
 *        Arguments object
 * @param {Object[]} config.playlists
 *        The media playlists from a master manifest
 * @param {string} [config.masterUri]
 *        URI of the master playlist containing the media playlists
 */
export const setupMasterMediaPlaylists = ({ playlists, masterUri }) => {
  // setup by-URI lookups and resolve media playlist URIs
  let i = playlists.length;

  while (i--) {
    const playlist = playlists[i];

    playlists[playlist.uri] = playlist;

    if (!playlist.attributes) {
      // TODO
      // log.warn('Invalid playlist STREAM-INF detected. Missing BANDWIDTH attribute.');
    }

    setupMediaPlaylist({
      playlist,
      masterUri,
      index: i
    });
  }
};

/*
 * Adds properties to the manifest that may not have been provided by the parser or object
 * provider.
 *
 * @param {Object} manifest
 *                 The manifest object
 * @param {string=} srcUri
 *                  The manifest's URI
 */
export const addPropertiesToParsedManifest = ({ manifest, srcUri }) => {
  if (srcUri) {
    manifest.uri = srcUri;
  }

  if (manifest.playlists) {
    resolveMediaGroupUris(manifest);
    setupMasterMediaPlaylists({
      playlists: manifest.playlists,
      masterUri: manifest.uri
    });
  } else {
    setupMediaPlaylist({
      playlist: manifest
    });
  }
};

/**
 * Parses a given m3u8 playlist, then sets up the media playlists and groups to prepare it
 * for use in VHS.
 *
 * This function is exported to allow others to reuse the same logic for constructing a
 * VHS manifest object from an HLS manifest string. It provides for consistent resolution
 * of playlists, media groups, and URIs as is done internally for VHS-downloaded
 * manifests. This is particularly useful in cases where a user may want to manipulate a
 * manifest object before passing it in as the source to VHS.
 *
 * @param {string} manifestString
 *        The downloaded manifest string
 * @param {Object[]} [customTagParsers]
 *        An array of custom tag parsers for the m3u8-parser instance
 * @param {Object[]} [customTagMappers]
 *         An array of custom tag mappers for the m3u8-parser instance
 * @return {Object}
 *         Parsed manifest object
 */
export const parseManifest = ({
  manifestString,
  customTagParsers = [],
  customTagMappers = [],
  src
}) => {
  const parser = new M3u8Parser();

  customTagParsers.forEach(customParser => parser.addParser(customParser));
  customTagMappers.forEach(mapper => parser.addTagMapper(mapper));

  parser.push(manifestString);
  parser.end();

  const manifest = parser.manifest;

  addPropertiesToParsedManifest({ manifest, srcUri: src });

  return manifest;
};

/**
 * Parses the master XML string and updates playlist URI references.
 *
 * This function is exported to allow others to reuse the same logic for constructing a
 * VHS manifest object from a DASH manifest XML string. It provides for consistent
 * resolution of playlists, media groups, and placeholder URIs as is done internally for
 * VHS-downloaded manifests. This is particularly useful in cases where a user may want to
 * manipulate a manifest object before passing it in as the source to VHS.
 *
 * @param {Object} config
 *        Arguments object
 * @param {string} config.masterXml
 *        The mpd XML
 * @param {string} config.srcUrl
 *        The mpd URL
 * @param {Date} config.clientOffset
 *         A time difference between server and client
 * @param {Object} config.sidxMapping
 *        SIDX mappings for moof/mdat URIs and byte ranges
 * @return {Object}
 *         The parsed mpd manifest object
 */
export const parseMasterXml = ({ masterXml, srcUrl, clientOffset, sidxMapping }) => {
  const master = parseMpd(masterXml, {
    manifestUri: srcUrl,
    clientOffset,
    sidxMapping
  });

  master.uri = srcUrl;

  // Set up phony URIs for the playlists since we won't have external URIs for DASH
  // but reference playlists by their URI throughout the project
  // TODO: Should we create the dummy uris in mpd-parser as well (leaning towards yes).
  for (let i = 0; i < master.playlists.length; i++) {
    const phonyUri = `placeholder-uri-${i}`;

    master.playlists[i].uri = phonyUri;
    // set up by URI references
    master.playlists[phonyUri] = master.playlists[i];
  }

  // set up phony URIs for the media group playlists since we won't have external
  // URIs for DASH but reference playlists by their URI throughout the project
  forEachMediaGroup(master, (properties, mediaType, groupKey, labelKey) => {
    if (properties.playlists && properties.playlists.length) {
      const phonyUri = `placeholder-uri-${mediaType}-${groupKey}-${labelKey}`;

      properties.playlists[0].uri = phonyUri;
      // setup URI references
      master.playlists[phonyUri] = properties.playlists[0];
    }
  });

  setupMasterMediaPlaylists({
    playlists: master.playlists,
    masterUri: master.uri
  });
  resolveMediaGroupUris(master);

  return master;
};
