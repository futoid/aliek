export default function (eleventyConfig) {
  // Copy root static files to _site/
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("favicon.ico");

  // Watch both locations
  eleventyConfig.addWatchTarget("./");
  eleventyConfig.addWatchTarget("./src/");

  return {
    dir: {
      input: "src", // Templates ONLY from src/
      output: "_site",
    },
  };
}
