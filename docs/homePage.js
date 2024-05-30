(function() {
    function updateDimensions() {
        var bubbleWidth = document.getElementById("bubbles").clientWidth,
            bubbleHeight = window.innerHeight * 0.7,
            histHeight = window.innerHeight * 0.3;
        
        return {
            bubbleWidth: bubbleWidth,
            bubbleHeight: bubbleHeight,
            histHeight: histHeight
        };
    }

    var dimensions = updateDimensions();

    var bubbleHomeSvg = d3.select("#bubbles")
        .append("svg")
        .attr("width", dimensions.bubbleWidth)
        .attr("height", dimensions.bubbleHeight)
        .append("g")
        .attr("transform", "translate(0,0)");

    var scaleRadius = d3.scaleSqrt().domain([0, 60000]).range([15, 100]);

    var simulation = d3.forceSimulation()
        //.force("center", d3.forceCenter(dimensions.bubbleWidth / 2, dimensions.bubbleHeight / 2))
        .force("x", d3.forceX(dimensions.bubbleWidth / 2).strength(0.05))
        .force("y", d3.forceY(dimensions.bubbleHeight / 2).strength(0.05))
        .force("collide", d3.forceCollide(function(d) {
            return scaleRadius(d.radius) + 5;
        }));

    

    d3.csv("homePageBroadData.csv").then(function(datapoints) {
        var homeMap = d3.group(datapoints, d => d.genres);
        var homeData = Array.from(homeMap, ([key, values]) => {
            return {
                genre: key,
                radius: values.length,
                values: values
            };
        });

        // maxPlaytime = d3.max(datapoints, d => +d.average_play_hours_per_day);
        var selectedGenre = null;

        var bubble_grad = bubbleHomeSvg.append("defs").append("linearGradient")
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

        var circle = bubbleHomeSvg.selectAll(".genres")
            .data(homeData)
            .enter().append("circle")
            .attr("class", "genres")
            .attr("r", function(d) {
                return scaleRadius(d.radius); // Use 90th percentile of playtime as radius
            })
            .style("fill", "url(#lin-grad)")
            .on("click", function(event, d) {
                if (selectedGenre) {
                    selectedGenre.style("fill", "url(#lin-grad)");
                }
                selectedGenre = d3.select(this).style("fill", "#69b3a2");
                showHistograms(d);
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
            })
            .call(
                d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded)
            );

        var text = bubbleHomeSvg.selectAll(".genre-text")
            .data(homeData)
            .enter().append("text")
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
                return d.genre;
            });

        simulation.nodes(homeData)
            .on('tick', ticked);


        function showHistograms(d) {
            showHistogram(d, "hist_est_own", "est_owner")
            showHistogram(d, "hist_user_score", "score")
            showHistogram(d, "hist_price", "price")
            showHistogram(d, "hist_peak_ccu", "ccu")
        }

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

        function showHistogram(d, hist_name, mode) {
            d3.select("#" + hist_name).selectAll("*").remove();

            var margin = { top: 50, right: 30, bottom: 50, left: 70 },
                width = document.getElementById(hist_name).clientWidth - margin.left - margin.right,
                height = document.getElementById(hist_name).clientHeight - margin.top - margin.bottom;

            var svg = d3.select("#" + hist_name)
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var hist_data;
            var x_domain_start = 1;
            var x_domain_end = 1;
            var y_domain_start = 1;
            var y_domain_end = 100000;
            var nb_bins = 10;
            var x_label, y_label, title;
            var tick_rotate = "0";
            var hist_color = "white";

            switch(mode) {
                case "est_owner": 
                    hist_data = d.values.map(d => d.estimated_owners | 0); 
                    x_domain_end = 10000000;
                    x_label = "Number of Estimated Owners";
                    y_label = "Frequency(Log Scale)";
                    title = d.genre + " Genre - Estimated Owners per Game";
                    tick_rotate = "45";
                    hist_color = "#81691a";
                    break;
                case "score": 
                    hist_data = d.values.map(d => +d.user_score);
                    x_domain_end = 100;
                    x_label = "Percentage of Positive Reviews per Game";
                    y_label = "Frequency(Log Scale)";
                    title = d.genre + " Genre - User Scores";
                    hist_color = "#612807";
                    break;
                case "price": 
                    hist_data = d.values.map(d => d.price); 
                    x_domain_end = 100;
                    x_label = "Price(in US Dollars)";
                    y_label = "Frequency(Log Scale)";
                    title = d.genre + " Genre - Price per Game";
                    hist_color = "#69b3a2";
                    break;
                case "ccu": 
                    hist_data = d.values.map(d => d.peak_ccu);
                    x_domain_end = 1000000;
                    x_label = "(Peak) Concurrently Playing User Number";
                    y_label = "Frequency(Log Scale)";
                    title = d.genre + " Genre - Peak CCU per Game";
                    tick_rotate = "45";
                    hist_color = "#00ADEE";
                    break;
                default: 
                    hist_data = d.values.map(d => d.price); //Shouldn't happen
            }

            var tooltip = d3.select("#" + hist_name)
                .append("div")
                .style("opacity", 0)
                .style("width", "100px")
                .style("background-color", "black")
                .style("color", "white")
                .style("position", "sticky")
            
            function showTooltip(event, d) {
                tooltip
                    .transition()
                    .duration(100)
                    .style("opacity", 1)
                tooltip
                    .html("Amount: " + d.length)   
                    .attr("left", (event.x) + "px")
            }

            function moveTooltip(event, d) {
                tooltip
                    .style("left", (event.x) + "px")
            }

            function hideTooltip(event, d) {
                tooltip
                    .transition()
                    .duration(100)
                    .style("opacity", 0)
            }

            var x = d3.scaleLinear()
                .domain([x_domain_start, x_domain_end]) // Fixed x-axis domain based on maximum playtime
                .range([0, width]);

            var histogram = d3.histogram()
                .value(d => d)
                .domain(x.domain())
                .thresholds(nb_bins); // Fixed number of bins

            var bins = histogram(hist_data);

            var y = d3.scaleLog()
                .domain([y_domain_start, y_domain_end]) // Fixed y-axis domain
                .range([height, 0])
                .nice();

            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x)
                .tickFormat(function (d) {
                    if ((d / 1000) >= 1) {
                        d = d / 1000 + "K";
                      }
                      return d;
                })
                )
                .style("color", "#dcdedf");

            svg.append("g")
                .call(d3.axisLeft(y)
                    .ticks(10, d3.format(",d"))
                    .tickValues([1, 10, 100, 1000, 10000, 100000])
                )
                .style("color", "#dcdedf")

            svg.selectAll("rect")
                .data(bins)
                .enter().append("rect")
                .attr("x", 1)
                .attr("transform", d => "translate(" + x(d.x0) + "," + y(d.length || 1) + ")")
                .attr("width", d => x(d.x1) - x(d.x0) - 1)
                .attr("height", d => height - y(d.length || 1))
                .style("fill", hist_color)
                .on("mouseover", showTooltip)
                .on("mousemove", moveTooltip)
                .on("mouseleave", hideTooltip);

            // Add X axis label
            svg.append("text")
                .attr("class", "x label")
                .attr("fill", "#dcdedf")
                .attr("font-family", "Noto Sans")
                .attr("text-anchor", "middle")
                .attr("x", width / 2)
                .attr("y", height + 40)
                .text(x_label);

            // Add Y axis label with distance from y-ticks
            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "middle")
                .attr("fill", "#dcdedf")
                .attr("font-family", "Noto Sans")
                .attr("x", -height / 2)
                .attr("y", -50)
                .attr("transform", "rotate(-90)")
                .text(y_label);

            // Add title
            svg.append("text")
                .attr("x", (width / 2))
                .attr("y", 0 - (margin.top / 2))
                .attr("fill", "#dcdedf")
                .attr("font-family", "Noto Sans")
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("text-decoration", "underline")
                .text(title);
        }
    }).catch(function(error) {
        console.error('Error loading the CSV file:', error);
    });

    window.addEventListener('resize', function() {
        var dimensions = updateDimensions();

        // Update the bubbleplot dimensions
        d3.select("#bubbles").select("svg")
            .attr("width", dimensions.bubbleWidth)
            .attr("height", dimensions.bubbleHeight);

        simulation.force("x", d3.forceX(dimensions.bubbleWidth / 2).strength(0.05))
            .force("y", d3.forceY(dimensions.bubbleHeight / 2).strength(0.05))
            .alpha(1).restart();

        // Update the histogram dimensions
        d3.select("#" + hist_name).select("svg")
            .attr("width", dimensions.bubbleWidth)
            .attr("height", dimensions.histHeight);
    });
})();
