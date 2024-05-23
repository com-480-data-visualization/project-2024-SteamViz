(function() {
    function updateDimensions() {
        var chartWidth = document.getElementById('chart').clientWidth,
            chartHeight = window.innerHeight * 0.7,
            boxplotHeight = window.innerHeight * 0.3;
        
        return {
            chartWidth: chartWidth,
            chartHeight: chartHeight,
            boxplotHeight: boxplotHeight
        };
    }

    var dimensions = updateDimensions();

    var chartSvg = d3.select("#chart")
        .append("svg")
        .attr("width", dimensions.chartWidth)
        .attr("height", dimensions.chartHeight)
        .append("g")
        .attr("transform", "translate(0,0)");

    var scaleRadius = d3.scaleSqrt().domain([12.97, 95.95]).range([15, 100]);

    var simulation = d3.forceSimulation()
        .force("x", d3.forceX(dimensions.chartWidth / 2).strength(0.05))
        .force("y", d3.forceY(dimensions.chartHeight / 2).strength(0.05))
        .force("collide", d3.forceCollide(function(d) {
            return scaleRadius(d.radius) + 5;
        }));

    var maxPlaytime;

    d3.csv("genreAddictivity.csv").then(function(datapoints) {
        var genreMap = d3.group(datapoints, d => d.genres);
        var genreData = Array.from(genreMap, ([key, values]) => {
            return {
                genre: key,
                radius: d3.mean(values, d => +d.average_play_hours_per_day * 60),
                values: values
            };
        });

        maxPlaytime = d3.max(datapoints, d => +d.average_play_hours_per_day);
        var selectedGenre = null;

        var circle = chartSvg.selectAll(".genres")
            .data(genreData)
            .enter().append("circle")
            .attr("class", "genres")
            .attr("r", function(d) {
                return scaleRadius(d.radius); // Use 90th percentile of playtime as radius
            })
            .style("fill", "orange")
            .on("click", function(event, d) {
                if (selectedGenre) {
                    selectedGenre.style("fill", "orange");
                }
                selectedGenre = d3.select(this).style("fill", "#69b3a2");
                showHistogram(d);
            })
            .on("mouseover", function(event, d) {
                d3.select(this).transition()
                    .duration(200)
                    .attr("r", scaleRadius(d.radius) * 1.1); // Scale up the radius by 10%
            })
            .on("mouseout", function(event, d) {
                d3.select(this).transition()
                    .duration(200)
                    .attr("r", scaleRadius(d.radius)); // Scale back to original size
            });

        var text = chartSvg.selectAll(".genre-text")
            .data(genreData)
            .enter().append("text")
            .attr("class", "genre-text")
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text(function(d) {
                return d.genre;
            });

        simulation.nodes(genreData)
            .on('tick', ticked);

        function ticked() {
            circle
                .attr("cx", function(d) {
                    return d.x;
                })
                .attr("cy", function(d) {
                    return d.y;
                });

            text
                .attr("x", function(d) {
                    return d.x;
                })
                .attr("y", function(d) {
                    return d.y;
                });
        }

        function showHistogram(d) {
            d3.select("#boxplot").selectAll("*").remove();

            var margin = { top: 50, right: 30, bottom: 50, left: 70 },
                width = document.getElementById('boxplot').clientWidth - margin.left - margin.right,
                height = document.getElementById('boxplot').clientHeight - margin.top - margin.bottom;

            var svg = d3.select("#boxplot")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var playtimes = d.values.map(d => +d.average_play_hours_per_day);

            var x = d3.scaleLinear()
                .domain([0, maxPlaytime]) // Fixed x-axis domain based on maximum playtime
                .range([0, width]);

            var histogram = d3.histogram()
                .value(d => d)
                .domain(x.domain())
                .thresholds(30); // Fixed number of bins

            var bins = histogram(playtimes);

            var y = d3.scaleLog()
                .domain([1, 10000]) // Fixed y-axis domain
                .range([height, 0])
                .nice();

            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x));

            svg.append("g")
                .call(d3.axisLeft(y)
                    .ticks(10, d3.format(",d"))
                    .tickValues([1, 10, 100, 1000, 10000])
                );

            svg.selectAll("rect")
                .data(bins)
                .enter().append("rect")
                .attr("x", 1)
                .attr("transform", d => "translate(" + x(d.x0) + "," + y(d.length || 1) + ")")
                .attr("width", d => x(d.x1) - x(d.x0) - 1)
                .attr("height", d => height - y(d.length || 1))
                .style("fill", "#69b3a2");

            // Add X axis label
            svg.append("text")
                .attr("class", "x label")
                .attr("text-anchor", "middle")
                .attr("x", width / 2)
                .attr("y", height + 40)
                .text("Average Play Hours Per Day");

            // Add Y axis label with distance from y-ticks
            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "middle")
                .attr("x", -height / 2)
                .attr("y", -50)
                .attr("transform", "rotate(-90)")
                .text("Frequency (Log Scale)");

            // Add title
            svg.append("text")
                .attr("x", (width / 2))
                .attr("y", 0 - (margin.top / 2))
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("text-decoration", "underline")
                .text(d.genre + " Playtime Distribution");
        }
    }).catch(function(error) {
        console.error('Error loading the CSV file:', error);
    });

    window.addEventListener('resize', function() {
        var dimensions = updateDimensions();

        // Update the chart dimensions
        d3.select("#chart").select("svg")
            .attr("width", dimensions.chartWidth)
            .attr("height", dimensions.chartHeight);

        simulation.force("x", d3.forceX(dimensions.chartWidth / 2).strength(0.05))
            .force("y", d3.forceY(dimensions.chartHeight / 2).strength(0.05))
            .alpha(1).restart();

        // Update the boxplot dimensions
        d3.select("#boxplot").select("svg")
            .attr("width", dimensions.chartWidth)
            .attr("height", dimensions.boxplotHeight);
    });
})();
