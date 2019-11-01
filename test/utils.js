import window from 'global/window';

// Attempts to produce an absolute URL to a given relative path
// based on window.location.href
export const urlTo = function(path) {
  if (!window.location || !window.location.href) {
    return path;
  }

  return window.location.href
    .split('/')
    .slice(0, -1)
    .concat([path])
    .join('/');
};
