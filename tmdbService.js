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

        // Extract and format movie data
        const movies = response.data.results
            .slice(0, count)
            .map((movie, index) => ({
                id: `m${index + 1}`,
                tmdbId: movie.id,
                title: movie.title,
                imageUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : '/images/placeholder.jpg',
                description: movie.overview,
                releaseYear: movie.release_date ? movie.release_date.split('-')[0] : '',
                rating: movie.vote_average
            }));

        // Store in cache
        movieCache[cacheKey] = movies;

        return movies;
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

        const movies = response.data.results
            .slice(0, count)
            .map((movie, index) => ({
                id: `m${index + 1}`,
                tmdbId: movie.id,
                title: movie.title,
                imageUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : '/images/placeholder.jpg',
                description: movie.overview,
                releaseYear: movie.release_date ? movie.release_date.split('-')[0] : '',
                rating: movie.vote_average
            }));

        movieCache[cacheKey] = movies;
        return movies;
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

        const movies = response.data.results
            .slice(0, count)
            .map((movie, index) => ({
                id: `m${index + 1}`,
                tmdbId: movie.id,
                title: movie.title,
                imageUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : '/images/placeholder.jpg',
                description: movie.overview,
                releaseYear: movie.release_date ? movie.release_date.split('-')[0] : '',
                rating: movie.vote_average
            }));

        movieCache[cacheKey] = movies;
        return movies;
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
function getFallbackMovies(count = 10) {
    const fallbackMovies = [
        { id: 'm1', title: 'The Shawshank Redemption', imageUrl: '/images/movie1.jpg', releaseYear: '1994', rating: 9.3 },
        { id: 'm2', title: 'The Godfather', imageUrl: '/images/movie2.jpg', releaseYear: '1972', rating: 9.2 },
        { id: 'm3', title: 'The Dark Knight', imageUrl: '/images/movie3.jpg', releaseYear: '2008', rating: 9.0 },
        { id: 'm4', title: 'Pulp Fiction', imageUrl: '/images/movie4.jpg', releaseYear: '1994', rating: 8.9 },
        { id: 'm5', title: 'Fight Club', imageUrl: '/images/movie5.jpg', releaseYear: '1999', rating: 8.8 },
        { id: 'm6', title: 'Inception', imageUrl: '/images/movie6.jpg', releaseYear: '2010', rating: 8.8 },
        { id: 'm7', title: 'The Matrix', imageUrl: '/images/movie7.jpg', releaseYear: '1999', rating: 8.7 },
        { id: 'm8', title: 'Goodfellas', imageUrl: '/images/movie8.jpg', releaseYear: '1990', rating: 8.7 },
        { id: 'm9', title: 'Seven', imageUrl: '/images/movie9.jpg', releaseYear: '1995', rating: 8.6 },
        { id: 'm10', title: 'The Silence of the Lambs', imageUrl: '/images/movie10.jpg', releaseYear: '1991', rating: 8.6 },
        { id: 'm11', title: 'Interstellar', imageUrl: '/images/placeholder.jpg', releaseYear: '2014', rating: 8.6 },
        { id: 'm12', title: 'The Lord of the Rings: The Fellowship of the Ring', imageUrl: '/images/placeholder.jpg', releaseYear: '2001', rating: 8.8 },
        { id: 'm13', title: 'Forrest Gump', imageUrl: '/images/placeholder.jpg', releaseYear: '1994', rating: 8.8 },
        { id: 'm14', title: 'The Empire Strikes Back', imageUrl: '/images/placeholder.jpg', releaseYear: '1980', rating: 8.7 },
        { id: 'm15', title: 'The Godfather: Part II', imageUrl: '/images/placeholder.jpg', releaseYear: '1974', rating: 9.0 }
    ];

    return fallbackMovies.slice(0, count);
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
    } else if (topic.startsWith('search:')) {
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