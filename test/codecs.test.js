import QUnit from 'qunit';
import {
  mapLegacyAvcCodecs,
  translateLegacyCodecs
} from '../src/codecs';

QUnit.module('Legacy Codecs');

QUnit.test('maps legacy AVC codecs', function(assert) {
  assert.equal(
    mapLegacyAvcCodecs('avc1.deadbeef'),
    'avc1.deadbeef',
    'does nothing for non legacy pattern'
  );
  assert.equal(
    mapLegacyAvcCodecs('avc1.dead.beef, mp4a.something'),
    'avc1.dead.beef, mp4a.something',
    'does nothing for non legacy pattern'
  );
  assert.equal(
    mapLegacyAvcCodecs('avc1.dead.beef,mp4a.something'),
    'avc1.dead.beef,mp4a.something',
    'does nothing for non legacy pattern'
  );
  assert.equal(
    mapLegacyAvcCodecs('mp4a.something,avc1.dead.beef'),
    'mp4a.something,avc1.dead.beef',
    'does nothing for non legacy pattern'
  );
  assert.equal(
    mapLegacyAvcCodecs('mp4a.something, avc1.dead.beef'),
    'mp4a.something, avc1.dead.beef',
    'does nothing for non legacy pattern'
  );
  assert.equal(
    mapLegacyAvcCodecs('avc1.42001e'),
    'avc1.42001e',
    'does nothing for non legacy pattern'
  );
  assert.equal(
    mapLegacyAvcCodecs('avc1.4d0020,mp4a.40.2'),
    'avc1.4d0020,mp4a.40.2',
    'does nothing for non legacy pattern'
  );
  assert.equal(
    mapLegacyAvcCodecs('mp4a.40.2,avc1.4d0020'),
    'mp4a.40.2,avc1.4d0020',
    'does nothing for non legacy pattern'
  );
  assert.equal(
    mapLegacyAvcCodecs('mp4a.40.40'),
    'mp4a.40.40',
    'does nothing for non video codecs'
  );

  assert.equal(
    mapLegacyAvcCodecs('avc1.66.30'),
    'avc1.42001e',
    'translates legacy video codec alone'
  );
  assert.equal(
    mapLegacyAvcCodecs('avc1.66.30, mp4a.40.2'),
    'avc1.42001e, mp4a.40.2',
    'translates legacy video codec when paired with audio'
  );
  assert.equal(
    mapLegacyAvcCodecs('mp4a.40.2, avc1.66.30'),
    'mp4a.40.2, avc1.42001e',
    'translates video codec when specified second'
  );
});

QUnit.test('translates legacy codecs', function(assert) {
  assert.deepEqual(
    translateLegacyCodecs(['avc1.66.30', 'avc1.66.30']),
    ['avc1.42001e', 'avc1.42001e'],
    'translates legacy avc1.66.30 codec'
  );

  assert.deepEqual(
    translateLegacyCodecs(['avc1.42C01E', 'avc1.42C01E']),
    ['avc1.42C01E', 'avc1.42C01E'],
    'does not translate modern codecs'
  );

  assert.deepEqual(
    translateLegacyCodecs(['avc1.42C01E', 'avc1.66.30']),
    ['avc1.42C01E', 'avc1.42001e'],
    'only translates legacy codecs when mixed'
  );

  assert.deepEqual(
    translateLegacyCodecs(['avc1.4d0020', 'avc1.100.41', 'avc1.77.41',
      'avc1.77.32', 'avc1.77.31', 'avc1.77.30',
      'avc1.66.30', 'avc1.66.21', 'avc1.42C01e']),
    ['avc1.4d0020', 'avc1.640029', 'avc1.4d0029',
      'avc1.4d0020', 'avc1.4d001f', 'avc1.4d001e',
      'avc1.42001e', 'avc1.420015', 'avc1.42C01e'],
    'translates a whole bunch'
  );
});
