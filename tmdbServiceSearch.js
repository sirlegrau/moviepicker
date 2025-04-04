const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w1280';

/**
 * Search TMDB for movie details by title and fetch additional details
 * @param {string[]} movieTitles - Array of movie titles to search for
 * @param {number} count - Maximum number of movies to return
 * @returns {Promise<Array>} - Promise resolving to formatted movie data
 */
async function getCustomMovies(movieTitles, count = 9) {
    try {
        // Limit the number of titles to process
        const titlesToProcess = movieTitles.slice(0, count);

        const moviePromises = titlesToProcess.map(async (title, index) => {
            try {
                // Search for the movie
                const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
                    params: {
                        api_key: API_KEY,
                        query: title,
                        include_adult: false,
                    }
                });

                // Get the first result
                const movie = searchResponse.data.results[0];

                if (!movie) {
                    console.log(`No results found for "${title}"`);
                    // Return a placeholder for movies not found
                    return {
                        id: `m${index + 1}`,
                        title: title,
                        imageUrl: null,
                        releaseYear: '',
                        rating: 0,
                        duration: 0
                    };
                }

                // Get additional movie details including runtime
                const movieDetails = await axios.get(`${TMDB_BASE_URL}/movie/${movie.id}`, {
                    params: {
                        api_key: API_KEY,
                    }
                });

                // Extract the year from release date (YYYY-MM-DD)
                const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : '';

                // Format the movie object to match the required structure
                return {
                    id: `m${index + 1}`,
                    title: movie.title,
                    imageUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
                    releaseYear: releaseYear,
                    rating: movie.vote_average || 0,
                    duration: movieDetails.data.runtime || 0
                };
            } catch (error) {
                console.error(`Error searching for "${title}":`, error.message);
                // Return a placeholder for errors
                return {
                    id: `m${index + 1}`,
                    title: title,
                    imageUrl: null,
                    releaseYear: '',
                    rating: 0,
                    duration: 0
                };
            }
        });

        // Wait for all promises to resolve
        const results = await Promise.all(moviePromises);

        // Return results (including any placeholders for not found movies)
        return results;
    } catch (error) {
        console.error('Error searching for custom movies:', error.message);
        throw error;
    }
}

module.exports = { getCustomMovies };