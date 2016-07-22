// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
import os from 'os'; // native node.js module
import { remote } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import env from './env';
import {Autocomplete} from './seasonvarcik/Autocomplete';
import {Engine} from './seasonvarcik/Engine';

let app = remote.app;
let appDir = jetpack.cwd(app.getAppPath());
let seasonvarcik = new Engine();

function setElementStatus(element, status) {
  element.classList.remove('error');
  element.classList.remove('ok');
  element.classList.add(status.toLowerCase());
}

function statusChange(text, status = 'ok') {
  let statusElm = document.getElementById('status');
  statusElm.innerHTML = text;
  setElementStatus(statusElm, status);
}

document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const movie = document.getElementById('movie');
  const playlist = document.getElementById('playlist');
  const movieBox = document.getElementById('movie-box');

  function cleanup() {
    playlist.innerHTML = '';
    movie.innerHTML = '';
    movieBox.innerHTML = '';
  }

  const search = new Autocomplete({
    input: '#search',
    xhr: {
      url: seasonvarcik.autocompleteUrl,
      method: 'GET',
      key: seasonvarcik.autocompleteParam,
    },
    onResult: (rawMovieObj, searchEngine) => {
      searchEngine.clearResults();
      const movieObj = JSON.parse(rawMovieObj);

      cleanup();

      movie.innerHTML = `
        <p>
          <b>Movie selected:</b>
          <br/>
          <a href="${movieObj.url}" class="js-external-link">${movieObj.title}</a>
        </p>
      `;

      statusChange('Fetching movie playlist...');

      seasonvarcik.playlist(movieObj.id).catch(error => {
        statusChange(`Error while fetching "${movieObj.title}" playlist: ${e.message}`, 'error');
      }).then(playlistObj => {
        const episodes = playlistObj.episodes;

        statusChange(`Movie playlist obtained (${episodes.length} episode/s)`);

        episodes.forEach(episode => {
          const episodeElm = document.createElement('a');
          episodeElm.innerHTML = episode.name;
          episodeElm.classList.add('episode');
          episodeElm.href = episode.source;

          episodeElm.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            episodeElm.classList.add('played-episode');
            movieBox.innerHTML = `
              <iframe src="${episode.source}"></iframe>
            `;

            return false;
          });

          playlist.appendChild(episodeElm);
        });
      });
    },
    render: {
      prepareResponse(response) {
        let responseVector = [];
        response.id = response.id || [];

        for (let i = 0; i < response.suggestions.length; i++) {
          if (response.suggestions[i].indexOf('<span') === 0) {
            break;
          } else if (!response.data.hasOwnProperty(i) ||
            !response.id.hasOwnProperty(i)) {

            continue;
          }

          responseVector.push({
            title: response.suggestions[i],
            id: response.id[i],
            url: seasonvarcik.url(response.data[i]),
          });
        }

        return responseVector;
      },
      renderItem(item) {
        const itemContainer = document.createElement('div');
        itemContainer.classList.add('autocomplete-item');
        itemContainer.dataset.autocompleteValue = JSON.stringify(item);
        itemContainer.innerHTML = item.title;

        return itemContainer.outerHTML;
      }
    },
  });

  try {
    statusChange('Initializing engine...');
    seasonvarcik.init().then(seasonvarcik => {
      statusChange(`Security mark obtained: ${seasonvarcik.securityMark}`);
    });
  } catch (e) {
    statusChange(`Error loading engine: ${e.message}`, 'error');
  }
});
