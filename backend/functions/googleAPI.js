require('dotenv').config();

const { getAwsSecret }= require('../public/awsSecret.js');
const { getAwsParameterGoogleApiVideos, getAwsParameterGoogleApiSearch } = require("../public/awsParameter");


// Function to generate tags from a filename
function generateTags(filename) {
    // List of common stopwords
    const stopwords = ["the", "and", "is", "in", "on", "of", "a", "an", "to", "for", "with", "by", "at", "from"];

    // Split the filename into words based on spaces, underscores, and non-alphanumeric characters
    const words = filename.toLowerCase().split(/[\s_]+/);

    // Remove stopwords
    const tags = words.filter(word => !stopwords.includes(word) && word.trim() !== "");

    return tags;
}

// Function to search YouTube videos
async function searchYouTube(query, maxResults = 25) {
    const secret = await getAwsSecret();
    const API_KEY = secret.API_KEY_GOOGLE;
    const queryTags = generateTags(query);
    const awsSearchUrl = await getAwsParameterGoogleApiSearch();
    const awsVideosUrl = await getAwsParameterGoogleApiVideos();

    const queryString = queryTags.join(' ');

    console.log('Searching YouTube for:', queryString);

    const searchUrl = `${awsSearchUrl}?part=snippet&q=${encodeURIComponent(queryString)}&maxResults=${maxResults}&key=${API_KEY}`;

    try {
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            throw new Error(`YouTube API error: ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        const validItems = searchData.items.filter(item => item.id.videoId !== undefined);
        const videoIds = validItems.map(item => item.id.videoId);

        console.log('Found', videoIds);

        // fecch statistics for each video
        const statsUrl = `${awsVideosUrl}?part=statistics&id=${videoIds.join(',')}&key=${API_KEY}`;
        const statsResponse = await fetch(statsUrl);
        if (!statsResponse.ok) {
            throw new Error(`YouTube API error: ${statsResponse.statusText}`);
        }

        const statsData = await statsResponse.json();

        // Combine search results with statistics
        const sortedResults = searchData.items.map(item => {
            const stats = statsData.items.find(stat => stat.id === item.id.videoId);
            return {
                title: item.snippet.title,
                description: item.snippet.description,
                videoId: item.id.videoId,
                thumbnails: item.snippet.thumbnails,
                viewCount: stats && stats.statistics ? parseInt(stats.statistics.viewCount, 10) : 0,
            };
        }).sort((a, b) => b.viewCount - a.viewCount); // Sort by view count

        // Return the top 10 results
        return sortedResults.slice(0, 10);
    } catch (error) {
        console.error('YouTube API error:', error);
        throw new Error('YouTube API error');
    }
}

module.exports = {
    generateTags,
    searchYouTube,
};