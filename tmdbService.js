const axios = require('axios');
require('dotenv').config();
const API_KEY = process.env.TMDB_API_KEY;


// Replace with your actual TMDB API key
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Topic mapping to TMDB API endpoints
const TOPIC_ENDPOINTS = {
    popular: '/movie/popular',
    topRated: '/movie/top_rated',
    nowPlaying: '/movie/now_playing',
    upcoming: '/movie/upcoming',
    animation: '/discover/movie?with_genres=16',
    action: '/discover/movie?with_genres=28',
    comedy: '/discover/movie?with_genres=35',
    horror: '/discover/movie?with_genres=27',
    sciFi: '/discover/movie?with_genres=878',
    romance: '/discover/movie?with_genres=10749',
    documentary: '/discover/movie?with_genres=99',
    classic: '/discover/movie?with_primary_release_date.lte=1990-01-01'
};

// Cache to avoid duplicate API calls
const movieCache = {};

/**
 * Fetch movie details including runtime from TMDB
 * @param {number} movieId - The TMDB movie ID
 * @returns {Promise<Object>} - Runtime in minutes or null if not available
 */
async function fetchMovieDetails(movieId) {
    try {
        const response = await axios.get(`${BASE_URL}/movie/${movieId}`, {
            params: {
                api_key: API_KEY,
                language: 'en-US',
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching details for movie ID ${movieId}:`, error.message);
        return { runtime: null };
    }
}

/**
 * Fetch movies from TMDB API based on topic
 * @param {string} topic - The movie topic/category
 * @param {number} count - Number of movies to fetch
 * @returns {Promise<Array>} - Array of formatted movie objects
 */
async function fetchMoviesByTopic(topic = 'popular', count = 10) {
    // Check cache first
    const cacheKey = `${topic}_${count}`;
    if (movieCache[cacheKey]) {
        return movieCache[cacheKey];
    }

    // Get the appropriate endpoint
    const endpoint = TOPIC_ENDPOINTS[topic] || TOPIC_ENDPOINTS.popular;

    try {
        // Make API request
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
            params: {
                api_key: API_KEY,
                language: 'en-US',
                page: 1
            }
        });

        // Extract basic movie data
        const moviesBasic = response.data.results.slice(0, count);

        // Fetch runtime for each movie
        const moviesWithDetails = await Promise.all(
            moviesBasic.map(async (movie, index) => {
                const details = await fetchMovieDetails(movie.id);
                return {
                    id: `m${index + 1}`,
                    tmdbId: movie.id,
                    title: movie.title,
                    imageUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : '/images/placeholder.jpg',
                    description: movie.overview,
                    releaseYear: movie.release_date ? movie.release_date.split('-')[0] : '',
                    rating: movie.vote_average,
                    duration: details.runtime || 0  // Add duration (runtime) field
                };
            })
        );

        // Store in cache
        movieCache[cacheKey] = moviesWithDetails;

        return moviesWithDetails;
    } catch (error) {
        console.error('Error fetching movies from TMDB:', error.message);
        return getFallbackMovies(count);
    }
}

/**
 * Fetch movies by a specific year range
 * @param {number} startYear - Starting year
 * @param {number} endYear - Ending year
 * @param {number} count - Number of movies to fetch
 * @returns {Promise<Array>} - Array of formatted movie objects
 */
async function fetchMoviesByYearRange(startYear, endYear, count = 10) {
    const cacheKey = `years_${startYear}_${endYear}_${count}`;
    if (movieCache[cacheKey]) {
        return movieCache[cacheKey];
    }

    try {
        const response = await axios.get(`${BASE_URL}/discover/movie`, {
            params: {
                api_key: API_KEY,
                language: 'en-US',
                sort_by: 'popularity.desc',
                'primary_release_date.gte': `${startYear}-01-01`,
                'primary_release_date.lte': `${endYear}-12-31`,
                page: 1
            }
        });

        // Extract basic movie data
        const moviesBasic = response.data.results.slice(0, count);

        // Fetch runtime for each movie
        const moviesWithDetails = await Promise.all(
            moviesBasic.map(async (movie, index) => {
                const details = await fetchMovieDetails(movie.id);
                return {
                    id: `m${index + 1}`,
                    tmdbId: movie.id,
                    title: movie.title,
                    imageUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : '/images/placeholder.jpg',
                    description: movie.overview,
                    releaseYear: movie.release_date ? movie.release_date.split('-')[0] : '',
                    rating: movie.vote_average,
                    duration: details.runtime || 0  // Add duration (runtime) field
                };
            })
        );

        movieCache[cacheKey] = moviesWithDetails;
        return moviesWithDetails;
    } catch (error) {
        console.error('Error fetching movies by year range:', error.message);
        return getFallbackMovies(count);
    }
}

/**
 * Search for movies by query
 * @param {string} query - Search query
 * @param {number} count - Number of movies to fetch
 * @returns {Promise<Array>} - Array of formatted movie objects
 */
async function searchMovies(query, count = 10) {
    const cacheKey = `search_${query}_${count}`;
    if (movieCache[cacheKey]) {
        return movieCache[cacheKey];
    }

    try {
        const response = await axios.get(`${BASE_URL}/search/movie`, {
            params: {
                api_key: API_KEY,
                language: 'en-US',
                query: query,
                page: 1
            }
        });

        // Extract basic movie data
        const moviesBasic = response.data.results.slice(0, count);

        // Fetch runtime for each movie
        const moviesWithDetails = await Promise.all(
            moviesBasic.map(async (movie, index) => {
                const details = await fetchMovieDetails(movie.id);
                return {
                    id: `m${index + 1}`,
                    tmdbId: movie.id,
                    title: movie.title,
                    imageUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : '/images/placeholder.jpg',
                    description: movie.overview,
                    releaseYear: movie.release_date ? movie.release_date.split('-')[0] : '',
                    rating: movie.vote_average,
                    duration: details.runtime || 0  // Add duration (runtime) field
                };
            })
        );

        movieCache[cacheKey] = moviesWithDetails;
        return moviesWithDetails;
    } catch (error) {
        console.error('Error searching movies:', error.message);
        return getFallbackMovies(count);
    }
}
/**
 * Get fallback movies in case the API fails
 * @param {number} count - Number of movies to return
 * @returns {Array} - Array of fallback movie objects
 */
function getFallbackMovies(count = 65) {
    const fallbackMovies =[
        { id: 'm1', title: 'In the Mood for Love', imageUrl: 'https://image.tmdb.org/t/p/w1280/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg', releaseYear: '2000', rating: 8.1, duration: 99 },
        { id: 'm2', title: 'Scenes from a Marriage', imageUrl: 'https://image.tmdb.org/t/p/w1280/ArKEdvJesIktFX8OAhcdKAOLl6I.jpg', releaseYear: '1974', rating: 8.1, duration: 169 },
        { id: 'm3', title: 'Yi Yi', imageUrl: 'https://image.tmdb.org/t/p/w1280/mR8dSQZI8X6Z1NClJhFrtJp636z.jpg', releaseYear: '2000', rating: 7.9, duration: 174 },
        { id: 'm4', title: 'The Zone of Interest', imageUrl: 'https://image.tmdb.org/t/p/w1280/hUu9zyZmDd8VZegKi1iK1Vk0RYS.jpg', releaseYear: '2023', rating: 7, duration: 105 },
        { id: 'm5', title: 'I\'m Still Here', imageUrl: 'https://image.tmdb.org/t/p/w1280/gZnsMbhCvhzAQlKaVpeFRHYjGyb.jpg', releaseYear: '2024', rating: 8, duration: 138 },
        { id: 'm6', title: 'A Taxi Driver', imageUrl: 'https://image.tmdb.org/t/p/w1280/iXVaWbxmyPk4KZGZk5GGDGFieMX.jpg', releaseYear: '2017', rating: 8.1, duration: 138 },
        { id: 'm7', title: 'The Worst Person in the World', imageUrl: 'https://image.tmdb.org/t/p/w1280/1NxGNQchGBTHXJ6RShLY1IlZqWn.jpg', releaseYear: '2021', rating: 7.5, duration: 128 },
        { id: 'm8', title: 'Roman Holiday', imageUrl: 'https://image.tmdb.org/t/p/w1280/8lI9dmz1RH20FAqltkGelY1v4BE.jpg', releaseYear: '1953', rating: 7.9, duration: 119 },
        { id: 'm9', title: 'Past Lives', imageUrl: 'https://image.tmdb.org/t/p/w1280/rzO71VFu7CpJMfF5TQNMj0d1lSV.jpg', releaseYear: '2023', rating: 7.7, duration: 106 },
        { id: 'm10', title: 'Moonrise Kingdom', imageUrl: 'https://image.tmdb.org/t/p/w1280/y4SXcbNl6CEF2t36icuzuBioj7K.jpg', releaseYear: '2012', rating: 7.7, duration: 94 },
        { id: 'm11', title: 'Hotel Pacific', imageUrl: 'https://image.tmdb.org/t/p/w1280/kdk7Kf7RQ49XxhBOuTLpFxvTmCI.jpg', releaseYear: '1975', rating: 7.4, duration: 94 },
        { id: 'm12', title: 'Exhuma', imageUrl: 'https://image.tmdb.org/t/p/w1280/6dasJ58GGFcC62H9KuukAryltUp.jpg', releaseYear: '2024', rating: 7.6, duration: 134 },
        { id: 'm13', title: 'The Elephant Man', imageUrl: 'https://image.tmdb.org/t/p/w1280/rk2lKgEtjF9HO9N2UFMRc2cMGdj.jpg', releaseYear: '1980', rating: 8, duration: 124 },
        { id: 'm14', title: 'Notting Hill', imageUrl: 'https://image.tmdb.org/t/p/w1280/k7cwPG5sVmCumxKZCukyu3SbyjG.jpg', releaseYear: '1999', rating: 7.3, duration: 124 },
        { id: 'm15', title: 'Fallen Leaves', imageUrl: 'https://image.tmdb.org/t/p/w1280/9ayYOpeqHhxfHHUoyt3kXzznECO.jpg', releaseYear: '2023', rating: 7.2, duration: 81 },
        { id: 'm16', title: 'CURE!', imageUrl: 'https://image.tmdb.org/t/p/w1280/aAyedPK8t4XLyetDlRTm9AJIP80.jpg', releaseYear: '2020', rating: 6, duration: 23 },
        { id: 'm17', title: 'Knives Out', imageUrl: 'https://image.tmdb.org/t/p/w1280/pThyQovXQrw2m0s9x82twj48Jq4.jpg', releaseYear: '2019', rating: 7.8, duration: 131 },
        { id: 'm18', title: 'Eternal Sunshine of the Spotless Mind', imageUrl: 'https://image.tmdb.org/t/p/w1280/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg', releaseYear: '2004', rating: 8.1, duration: 108 },
        { id: 'm19', title: 'Primer', imageUrl: 'https://image.tmdb.org/t/p/w1280/xEoq2WmDzpzxhkHEsmOYOg6BPg6.jpg', releaseYear: '2004', rating: 6.8, duration: 77 },
        { id: 'm20', title: 'There Will Be Blood', imageUrl: 'https://image.tmdb.org/t/p/w1280/nuZDiX8okojcwkStdaMjA9LUQAT.jpg', releaseYear: '2007', rating: 8.1, duration: 158 },
        { id: 'm21', title: 'The Grand Budapest Hotel', imageUrl: 'https://image.tmdb.org/t/p/w1280/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg', releaseYear: '2014', rating: 8, duration: 100 },
        { id: 'm22', title: 'Memories of Murder', imageUrl: 'https://image.tmdb.org/t/p/w1280/jcgUjx1QcupGzjntTVlnQ15lHqy.jpg', releaseYear: '2003', rating: 8.1, duration: 131 },
        { id: 'm23', title: 'American Psycho', imageUrl: 'https://image.tmdb.org/t/p/w1280/9uGHEgsiUXjCNq8wdq4r49YL8A1.jpg', releaseYear: '2000', rating: 7.4, duration: 102 },
        { id: 'm24', title: 'A Brighter Summer Day', imageUrl: 'https://image.tmdb.org/t/p/w1280/3l8fOAwiN3N5n3hHnZ51eog7Zu2.jpg', releaseYear: '1991', rating: 8.3, duration: 237 },
        { id: 'm25', title: 'Corner Office', imageUrl: 'https://image.tmdb.org/t/p/w1280/2JOPMnpaaTBvhy0HCby9uSBkt11.jpg', releaseYear: '2023', rating: 6.6, duration: 102 },
        { id: 'm26', title: 'The England Comedy Special', imageUrl: 'https://image.tmdb.org/t/p/w1280/aMRIIiLrBNsSFx2glg7nbzK67ty.jpg', releaseYear: 'N/A', rating: 0, duration: 274 },
        { id: 'm27', title: 'The Crossing', imageUrl: 'https://image.tmdb.org/t/p/w1280/9LuskivFVMBaUf1RFfqUwE8KNwG.jpg', releaseYear: '2000', rating: 6.5, duration: 89 },
        { id: 'm28', title: 'Inu-Oh', imageUrl: 'https://image.tmdb.org/t/p/w1280/o2J2zS1SwJdAflgtsdiuofn03kd.jpg', releaseYear: '2022', rating: 7.3, duration: 99 },
        { id: 'm29', title: 'Asparagus', imageUrl: 'https://image.tmdb.org/t/p/w1280/vt5shhypt7fGzm1GslyUhCXN5dH.jpg', releaseYear: '1979', rating: 6.6, duration: 20 },
        { id: 'm30', title: 'A Town Called Panic', imageUrl: 'https://image.tmdb.org/t/p/w1280/9Q1jtFU1zutKsAR9lwAl6YMkgZM.jpg', releaseYear: '2009', rating: 7.5, duration: 74 },
        { id: 'm31', title: 'Ice Merchants', imageUrl: 'https://image.tmdb.org/t/p/w1280/s2H9jJIqIYk4X99GN4PUMG4on8O.jpg', releaseYear: '2023', rating: 7.7, duration: 14 },
        { id: 'm32', title: 'Monsoon Blue', imageUrl: 'https://image.tmdb.org/t/p/w1280/2RDiCQrMBYo9RS1hUL2hR9QlSa2.jpg', releaseYear: '2023', rating: 0, duration: 14 },
        { id: 'm33', title: 'The Tale of The Princess Kaguya', imageUrl: 'https://image.tmdb.org/t/p/w1280/mWRQNlWXYYfd2z4FRm99MsgHgiA.jpg', releaseYear: '2013', rating: 8.1, duration: 137 },
        { id: 'm34', title: 'Hair High', imageUrl: 'https://image.tmdb.org/t/p/w1280/3FhSXe000gBExEjg89Tex0jofVd.jpg', releaseYear: '2004', rating: 6.6, duration: 78 },
        { id: 'm35', title: 'Princess Mononoke', imageUrl: 'https://image.tmdb.org/t/p/w1280/cMYCDADoLKLbB83g4WnJegaZimC.jpg', releaseYear: '1997', rating: 8.3, duration: 134 },
        { id: 'm36', title: 'Fantasia', imageUrl: 'https://image.tmdb.org/t/p/w1280/5m9njnidjR0syG2gpVPVgcEMB2X.jpg', releaseYear: '1940', rating: 7.4, duration: 124 },
        { id: 'm37', title: 'The King of Pigs', imageUrl: 'https://image.tmdb.org/t/p/w1280/o93tMT3eyeOXBZ8F8TiGQWUq3Ta.jpg', releaseYear: '2011', rating: 6.1, duration: 97 },
        { id: 'm38', title: 'The Triplets of Belleville', imageUrl: 'https://image.tmdb.org/t/p/w1280/enw6C4fDw88g0nOQgIJXjgH3NHi.jpg', releaseYear: '2003', rating: 7.4, duration: 80 },
        { id: 'm39', title: 'Conclave', imageUrl: 'https://image.tmdb.org/t/p/w1280/m5x8D0bZ3eKqIVWZ5y7TnZ2oTVg.jpg', releaseYear: '2024', rating: 7.2, duration: 120 },
        { id: 'm40', title: 'Soundtrack to a Coup d\'Etat', imageUrl: 'https://image.tmdb.org/t/p/w1280/eZOB9UurVQjpdIp72L49pyd3anw.jpg', releaseYear: '2024', rating: 7.3, duration: 150 },
        { id: 'm41', title: 'Pursuit of Happiness', imageUrl: 'https://image.tmdb.org/t/p/w1280/9JT1wMRI3SToncVwhSLg4negF0V.jpg', releaseYear: '2001', rating: 5.4, duration: 93 },
        { id: 'm42', title: 'The Days to Come', imageUrl: 'https://image.tmdb.org/t/p/w1280/sSuzOfK4cLUBnUv2INkLdBL0XjZ.jpg', releaseYear: '2019', rating: 6, duration: 95 },
        { id: 'm43', title: 'Society of Clothes', imageUrl: 'https://image.tmdb.org/t/p/w1280/sUMXdNCpwJIf4DFz4u9lNCS7g9r.jpg', releaseYear: '2024', rating: 0, duration: 15 },
        { id: 'm44', title: 'George the Hedgehog', imageUrl: 'https://image.tmdb.org/t/p/w1280/h6b4vtVfN3yneXSrarkpvQ1s2Ww.jpg', releaseYear: '2011', rating: 4.5, duration: 76 },
        { id: 'm45', title: 'Mickey 17', imageUrl: 'https://image.tmdb.org/t/p/w1280/edKpE9B5qN3e559OuMCLZdW1iBZ.jpg', releaseYear: '2025', rating: 7, duration: 137 },
        { id: 'm46', title: 'The Spiderwick Chronicles', imageUrl: 'https://image.tmdb.org/t/p/w1280/y0zqUbwK8FWIkelnlmnRkntz9F8.jpg', releaseYear: '2008', rating: 6.7, duration: 95 },
        { id: 'm47', title: 'WHAT DID JACK DO?', imageUrl: 'https://image.tmdb.org/t/p/w1280/68FofMgclH1qCNXoL6foBqPfNFD.jpg', releaseYear: '2017', rating: 6.3, duration: 17 },
        { id: 'm48', title: 'Independence Day', imageUrl: 'https://image.tmdb.org/t/p/w1280/p0BPQGSPoSa8Ml0DAf2mB2kCU0R.jpg', releaseYear: '1996', rating: 6.9, duration: 145 },
        { id: 'm49', title: 'Sound of Metal', imageUrl: 'https://image.tmdb.org/t/p/w1280/3178oOJKKPDeQ2legWQvMPpllv.jpg', releaseYear: '2020', rating: 7.7, duration: 120 },
        { id: 'm50', title: 'CURE!', imageUrl: 'https://image.tmdb.org/t/p/w1280/aAyedPK8t4XLyetDlRTm9AJIP80.jpg', releaseYear: '2020', rating: 6, duration: 23 },
        { id: 'm51', title: 'The Tune', imageUrl: 'https://image.tmdb.org/t/p/w1280/4pheWWXiVMQ4zK6O9mm4YnSwZ6S.jpg', releaseYear: '1992', rating: 6.2, duration: 70 },
        { id: 'm52', title: 'Wizards', imageUrl: 'https://image.tmdb.org/t/p/w1280/jyQsIPlub6ckhl3G81bqNDO7DD1.jpg', releaseYear: '1977', rating: 6.2, duration: 80 },
        { id: 'm53', title: 'The Beasts', imageUrl: 'https://image.tmdb.org/t/p/w1280/ytWMRYLlusyzMFFjyuFRY1liteR.jpg', releaseYear: '2022', rating: 7.5, duration: 138 },
        { id: 'm54', title: 'The Good Boss', imageUrl: 'https://image.tmdb.org/t/p/w1280/x1OgeRKB8AoOYKt3DzxJelLLpLA.jpg', releaseYear: '2021', rating: 7, duration: 120 },
        { id: 'm55', title: 'Soul', imageUrl: 'https://image.tmdb.org/t/p/w1280/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg', releaseYear: '2020', rating: 8.1, duration: 101 },
        { id: 'm56', title: 'District 9', imageUrl: 'https://image.tmdb.org/t/p/w1280/kYkK0KIBygtYQzBpjMgQyya4Re7.jpg', releaseYear: '2009', rating: 7.4, duration: 112 },
        { id: 'm57', title: 'Buena Vista Social Club', imageUrl: 'https://image.tmdb.org/t/p/w1280/b203Z3qwCRMLOY00XZh4qNQCwM4.jpg', releaseYear: '1999', rating: 7.5, duration: 105 },
        { id: 'm58', title: 'The Prince of Egypt', imageUrl: 'https://image.tmdb.org/t/p/w1280/2xUjYwL6Ol7TLJPPKs7sYW5PWLX.jpg', releaseYear: '1998', rating: 7.3, duration: 99 },
        { id: 'm59', title: 'Monster House', imageUrl: 'https://image.tmdb.org/t/p/w1280/zCRPr4bkO3ae0U1134vJ39xZnAG.jpg', releaseYear: '2006', rating: 6.7, duration: 91 },
        { id: 'm60', title: 'Spontaneous', imageUrl: 'https://image.tmdb.org/t/p/w1280/qhDICM8YxuDn9241O2UVEe9DupC.jpg', releaseYear: '2020', rating: 6.8, duration: 102 },
        { id: 'm61', title: 'Sharknado', imageUrl: 'https://image.tmdb.org/t/p/w1280/atEmHkVFTSGRYt2PeCiziQqbZnI.jpg', releaseYear: '2013', rating: 3.9, duration: 86 },
        { id: 'm62', title: 'Santa Claus Conquers the Martians', imageUrl: 'https://image.tmdb.org/t/p/w1280/f8lxrcMx98AuvlLSb2hPkz0CuH0.jpg', releaseYear: '1964', rating: 3.1, duration: 81 },
        { id: 'm63', title: 'Bratz', imageUrl: 'https://image.tmdb.org/t/p/w1280/d3nBTU0geb4PTvMMkjGICAlg7Uc.jpg', releaseYear: '2007', rating: 5.8, duration: 102 },
        { id: 'm64', title: 'The Emoji Movie', imageUrl: 'https://image.tmdb.org/t/p/w1280/60bTx5z9zL1AqCjZ0gmWoRMJ6Bb.jpg', releaseYear: '2017', rating: 5.4, duration: 86 },
        { id: 'm65', title: 'Winnie-the-Pooh: Blood and Honey 3', imageUrl: 'https://image.tmdb.org/t/p/w1280/fmFIEe3IejfMx71VIpZDdSCYCxX.jpg', releaseYear: 'N/A', rating: 0, duration: 0 }
    ];

    return fallbackMovies.slice(0, count);
}

function getcaudalesmaricon(count = 11) {
    const caudalesmaricon =[
        { id: 'm1', title: 'The Electric State', imageUrl: 'https://image.tmdb.org/t/p/w1280/1TZ9Er1xEAKizzKKqYVgJIhNkN2.jpg', releaseYear: '2025', rating: 6.6, duration: 125 },
        { id: 'm2', title: 'Sisu', imageUrl: 'https://image.tmdb.org/t/p/w1280/ygO9lowFMXWymATCrhoQXd6gCEh.jpg', releaseYear: '2022', rating: 7.4, duration: 91 },
        { id: 'm3', title: 'King Kong', imageUrl: 'https://image.tmdb.org/t/p/w1280/paYKhEwUaxKA05vmOfU7FlleTln.jpg', releaseYear: '1976', rating: 6.2, duration: 134 },
        { id: 'm4', title: 'Frida', imageUrl: 'https://image.tmdb.org/t/p/w1280/a4hgR6aKoohB6MHni171jbi9BkU.jpg', releaseYear: '2002', rating: 7.4, duration: 123 },
        { id: 'm5', title: 'The Intern', imageUrl: 'https://image.tmdb.org/t/p/w1280/9UoAC9tu8kIyRy8AcJnGhnH0gOH.jpg', releaseYear: '2015', rating: 7.2, duration: 121 },
        { id: 'm6', title: 'Interstellar', imageUrl: 'https://image.tmdb.org/t/p/w1280/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', releaseYear: '2014', rating: 8.5, duration: 169 },
        { id: 'm7', title: 'The Black Phone', imageUrl: 'https://image.tmdb.org/t/p/w1280/p9ZUzCyy9wRTDuuQexkQ78R2BgF.jpg', releaseYear: '2022', rating: 7.6, duration: 103 },
        { id: 'm8', title: 'King Richard', imageUrl: 'https://image.tmdb.org/t/p/w1280/2dfujXrxePtYJPiPHj1HkAFQvpu.jpg', releaseYear: '2021', rating: 7.6, duration: 144 },
        { id: 'm9', title: 'Whiplash', imageUrl: 'https://image.tmdb.org/t/p/w1280/7fn624j5lj3xTme2SgiLCeuedmO.jpg', releaseYear: '2014', rating: 8.4, duration: 107 },
        { id: 'm10', title: 'The Core', imageUrl: 'https://image.tmdb.org/t/p/w1280/iMPR3OFhKNVvJw4eZoRhf9RzfHJ.jpg', releaseYear: '2003', rating: 5.8, duration: 136 },
        { id: 'm11', title: 'The Life List', imageUrl: 'https://image.tmdb.org/t/p/w1280/5fg98cVo7da7OIK45csdLSd4NaU.jpg', releaseYear: '2025', rating: 6.9, duration: 123 }
    ];

    return caudalesmaricon.slice(0, count);
}


/**
 * Main function to get movies for the game
 * @param {string} topic - The movie topic/category
 * @param {number} count - Number of movies to fetch
 * @returns {Promise<Array>} - Array of movie objects
 */
async function getMoviesForGame(topic = 'popular', count = 15) {
    // Handle special topics
    if (topic === 'classics') {
        return fetchMoviesByYearRange(1930, 1980, count);
    } else if (topic === 'modern') {
        return fetchMoviesByYearRange(2010, new Date().getFullYear(), count);
    } else if (topic === '90s') {
        return fetchMoviesByYearRange(1990, 1999, count);
    } else if (topic === '80s') {
        return fetchMoviesByYearRange(1980, 1989, count);
    }else if (topic === 'GRANOTISMO') {
        return getFallbackMovies(65);
    }
    else if (topic === 'caudalesmaricon') {
        return getcaudalesmaricon(60);
    }else if (topic.startsWith('search:')) {
        const query = topic.replace('search:', '').trim();
        return searchMovies(query, count);
    } else {
        // Standard topic
        return fetchMoviesByTopic(topic, count);
    }
}

module.exports = {
    getMoviesForGame,
    fetchMoviesByTopic,
    fetchMoviesByYearRange,
    searchMovies
};