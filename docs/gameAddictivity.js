(function() {
    function updateDimensions() {
        var chartWidth = document.getElementById('bubbles').clientWidth,
            chartHeight = window.innerHeight * 0.7,
            tableHeight = window.innerHeight * 0.3;
        
        return {
            chartWidth: chartWidth,
            chartHeight: chartHeight,
            tableHeight: tableHeight
        };
    }

    var dimensions = updateDimensions();

    var chartSvg = d3.select("#bubbles")
        .append("svg")
        .attr("width", dimensions.chartWidth)
        .attr("height", dimensions.chartHeight)
        .append("g")
        .attr("transform", "translate(0,0)");

    var scaleRadius = d3.scaleSqrt().domain([1.8, 22.8]).range([20, 100]);

    var simulation = d3.forceSimulation()
        .force("x", d3.forceX(dimensions.chartWidth / 2).strength(0.05))
        .force("y", d3.forceY(dimensions.chartHeight / 2).strength(0.05))
        .force("collide", d3.forceCollide(function(d) {
            return scaleRadius(d.radius) * 1.5 + 10;
        }));

    var maxPlaytime;

    d3.csv("gameAddictivity.csv").then(function(datapoints) {
        var genreMap = d3.group(datapoints, d => d.addictivity);
        var genreData = Array.from(genreMap, ([key, values]) => {
            return {
                addictivity: key,
                radius: d3.mean(values, d => +d.average_play_hours_per_day),
                values: values
            };
        });

        maxPlaytime = d3.max(datapoints, d => +d.average_play_hours_per_day);
        var selectedCat = null;

        var bubble_grad = chartSvg.append("defs").append("linearGradient")
        .attr("id", "lin-grad")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "100%");

        bubble_grad.append("stop")
        .attr("offset", "0%")
        .style("stop-color", "#00ADEE")
        .style("stop-opacity", 1);

        bubble_grad.append("stop")
        .attr("offset", "100%")
        .style("stop-color", "#000000")
        .style("stop-opacity", 1)

        function dragStarted (event, d) {
            if(!event.active) simulation.alphaTarget(.03).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged (event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragEnded (event, d) {
            d.fx = null;
            d.fy = null;
        }

        var bubbleGroup = chartSvg.selectAll(".genres")
            .data(genreData)
            .enter().append("g")
            .attr("class", "genres");

        bubbleGroup.append("circle")
            .attr("r", function(d) {
                return scaleRadius(d.radius) * 1.50; 
            })
            .style("fill", "url(#lin-grad)")
            .on("click", function(event, d) {
                if (selectedCat) {
                    selectedCat.style("fill", "url(#lin-grad)");
                }
                selectedCat = d3.select(this).style("fill", "#69b3a2");
                showTopGames(d);
            })
            .on("mouseover", function(event, d) {
                d3.select(this).transition()
                    .duration(200)
                    .attr("r", scaleRadius(d.radius) * 1.1 * 1.5); // Scale up the radius by 10%
            })
            .on("mouseout", function(event, d) {
                d3.select(this).transition()
                    .duration(200)
                    .attr("r", scaleRadius(d.radius) * 1.5); // Scale back to original size
            })
            .call(
                d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded)
            );

        bubbleGroup.append("text")
            .attr("class", "genre-text")
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .attr("fill", "white")
            .attr("font-size", function (d) {
                const size = scaleRadius(d.radius) * 0.02;
                return size + "em";
            })
            .attr("font-family", "Noto Sans")
            .text(function(d) {
                return d.addictivity;
            });

        simulation.nodes(genreData)
            .on('tick', ticked);

        function ticked() {
            bubbleGroup
                .attr("transform", function(d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
        }

        function showTopGames(d) {
            d3.select("#table").selectAll("*").remove();

            var margin = { top: 50, right: 30, bottom: 50, left: 50 },
                width = document.getElementById('table').clientWidth - margin.left - margin.right,
                height = document.getElementById('table').clientHeight - margin.top - margin.bottom;

            var svg = d3.select("#table")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var topGames = d.values.sort((a, b) => +b.average_play_hours_per_day - +a.average_play_hours_per_day).slice(0, 5);

            var x = d3.scaleLinear()
                .domain([0, maxPlaytime]) // Fixed x-axis domain based on maximum playtime
                .range([0, width]);

            var y = d3.scaleBand()
                .domain(topGames.map(d => d.name))
                .range([0, height])
                .padding(0.1);

            var barHeight = Math.min(y.bandwidth(), 40); // Set a maximum bar height

            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x).tickValues(d3.range(0, maxPlaytime + 1, 2))) // Fixed x-ticks
                .style("color", "#dcdedf"); 

            svg.selectAll(".bar")
                .data(topGames)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", (d, i) => (height - (topGames.length * barHeight)) / 2 + i * barHeight) // Center bars vertically
                .attr("width", d => x(d.average_play_hours_per_day))
                .attr("height", barHeight - 1) // Set the bar height
                .attr("fill", "url(#lin-grad)");

            // Add game names to the bars
            svg.selectAll(".bar-label")
                .data(topGames)
                .enter().append("text")
                .attr("class", "bar-label")
                .attr("fill", "#dcdedf")
                .attr("font-family", "Noto Sans")
                .attr("x", d => x(d.average_play_hours_per_day) / 2) // Center horizontally
                .attr("y", (d, i) => (height - (topGames.length * barHeight)) / 2 + i * barHeight + barHeight / 2) // Center vertically
                .attr("dy", ".35em")
                .attr("text-anchor", "middle")
                .text(d => d.name);

            // Add X axis label
            svg.append("text")
                .attr("class", "x label")
                .attr("text-anchor", "middle")
                .attr("fill", "#dcdedf")
                .attr("font-family", "Noto Sans")
                .attr("x", width / 2)
                .attr("y", height + 40)
                .text("Average Play Hours Per Day");

            // Add Y axis label
            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "middle")
                .attr("fill", "#dcdedf")
                .attr("font-family", "Noto Sans")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 15)
                .attr("transform", "rotate(-90)")
                .text("Top 5 Games");

            // Add title
            svg.append("text")
                .attr("x", (width / 2))             
                .attr("y", 0 - (margin.top / 2))
                .attr("fill", "#dcdedf")
                .attr("font-family", "Noto Sans")
                .attr("text-anchor", "middle")  
                .style("font-size", "16px") 
                .style("text-decoration", "underline")  
                .text("Top 5 " + d.addictivity + " Games");
        }
    }).catch(function(error) {
        console.error('Error loading the CSV file:', error);
    });

    window.addEventListener('resize', function() {
        var dimensions = updateDimensions();

        // Update the chart dimensions
        d3.select("#bubbles").select("svg")
            .attr("width", dimensions.chartWidth)
            .attr("height", dimensions.chartHeight);

        simulation.force("x", d3.forceX(dimensions.chartWidth / 2).strength(0.05))
                  .force("y", d3.forceY(dimensions.chartHeight / 2).strength(0.05))
                  .alpha(1).restart();

        // Update the table dimensions
        d3.select("#table").select("svg")
            .attr("width", dimensions.chartWidth)
            .attr("height", dimensions.tableHeight);
    });
})();
