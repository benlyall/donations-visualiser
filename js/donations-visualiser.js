var w = window,
    d = document,
    e = d.documentElement,
    g = d3.select("body").node(),
    width = g.clientWidth,
    height = w.innerHeight || e.clientHeight || g.clientHeight,
    parties, entites, receipts, receiptTypes,
    svg, selectedParties, selectedReceiptTypes, madeLinks, container, nodeElements, linkElements, messageElements,
    messageG, linksG, nodesG, drawLinks = [], drawNodes = [], nodes = [], selectedYears, nodeIds = {};

d3.select("#hover-info").style("display", "none");

var zoom = d3.behavior.zoom()
               .scale(1)
               .scaleExtent([.2, 1.8])
               .on("zoom", zoomed);

var slider = d3.select("#zoom-controls").select("input")
    .datum({})
    .attr("value", zoom.scale())
    .attr("min", zoom.scaleExtent()[0])
    .attr("max", zoom.scaleExtent()[1])
    .attr("step", .1)
    .on("input", slided);

var nodeColors = d3.scale.category20();

var radiusScale = d3.scale.sqrt().range([5, 30]);

var resizeWindow = function() {
                       width = g.clientWidth,
                       height = w.innerHeight || e.clientHeight || g.clientHeight,

                       svg.attr("width", width)
                           .attr("height", height);

                       force.size([width, height]);
                       force.start();
                    }
d3.select(w).on("resize", resizeWindow);
$('.navmenu-fixed-left').offcanvas({ autohide: false, toggle: false });
$('.navmenu-fixed-left').offcanvas('hide');
$('#filter-toggle').on('click', function(d) {
    $('.navmenu-fixed-left').offcanvas('toggle');
    if (d3.select("#filter-button").style("left") == "10px") {
        d3.select("#filter-button").transition().ease("linear").style("left", "310px");
        d3.select("#filter-toggle").html("<span class=\"glyphicon glyphicon-chevron-left\"></span>");
        d3.select("#zoom-controls").transition().ease("linear").style("left", "324px");
    } else {
        d3.select("#filter-button").transition().ease("linear").style("left", "10px");
        d3.select("#zoom-controls").transition().ease("linear").style("left", "24px");
        d3.select("#filter-toggle").html("<span class=\"glyphicon glyphicon-filter\"></span>");
    }
});

$('.navmenu-fixed-right').offcanvas({autohide: false, toggle: false });
$('.navmenu-fixed-right').offcanvas('hide');
$('#info-toggle').on('click', function(d) {
    $('.navmenu-fixed-right').offcanvas('toggle');
    if (d3.select("#info-button").style("right") == "10px") {
        d3.select("#info-button").transition().ease("linear").style("right", "310px");
        d3.select("#info-toggle").html("<span class=\"glyphicon glyphicon-chevron-right\"></span>");
    } else {
        d3.select("#info-button").transition().ease("linear").style("right", "10px");
        d3.select("#info-toggle").html("<span class=\"glyphicon glyphicon-info-sign\"></span>");
    }
});

d3.select("#year-select-all").on("click", selectAllYears);
d3.select("#party-select-all").on("click", selectAllParties);
d3.select("#receipt-type-select-all").on("click", selectAllReceiptTypes);
d3.select("#clear-search").on("click", clearSearch);



var dollarFormat = d3.format("$,.0f");

var force = d3.layout.force()
              .size([width, height])
              .charge(function(n) {
                  return -8 * Math.pow(radiusScale(n.TotalAmount), 2);
              })
              .linkDistance(55)
              .theta(0.5)
              .friction(0.75)
              .gravity(0.3)
              .on("tick", tick);


d3.json("data/all_data.json", processData);

function zoomed() {
    container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    slider.property("value", d3.event.scale);
}

function slided(d) {
    zoom.scale(d3.select(this).property("value")).event(svg);
}

function radius(node) {
    if (node.Type === 'Party') {
        return 10;
    } else {
        return 5;
    }
}


function getYears() {
    var minYear = Infinity, maxYear = -Infinity;
    receipts.forEach(function(r) {
        if (+r.Year < minYear) {
            minYear = +r.Year;
        } else if (+r.Year > maxYear) {
            maxYear = +r.Year;
        }
    });

    return [minYear, maxYear];
}

function search() {
    var term = d3.select("#search").node().value;
    var searchRegEx = new RegExp(term.toLowerCase());

    nodeElements.each(function(d) {
        var element, match;
        element = d3.select(this);
        match = d.Name.toLowerCase().search(searchRegEx);

        if (term.length > 0 && match >= 0) {
            element.style("fill", "#ff1d8e")
                   .style("stroke", "#000");
            element.transition().attr("r", radiusScale(d.TotalAmount)*2).transition().attr("r", radiusScale(d.TotalAmount));
            return d.searched = true;
        } else {
            d.searched = false;
            return element.style("fill", function(d, i) { return nodeColors(d.Name); })
                          .style("stroke", "#ddd");
        }
    });
}

function nodeClick(node, i) {
    var html;

    if (node.Type == "Party") {
        html = "<h3>" + node.Name + "</h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Party</p>\n";
        html += "<p>Total Amount Received: " + dollarFormat(node.TotalAmount) + "</p>";
    } else {
        html = "<h3>" + node.Name + "</h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Payer</p>\n";
        html += "<p>Total Amount Paid: " + dollarFormat(node.TotalAmount) + "</p>";
    }

    d3.select("#info-panel").html(html);
    $('.navmenu-fixed-right').offcanvas('show');
    d3.select("#info-button").transition().ease("linear").style("right", "310px");
    d3.select("#info-toggle").html("<span class=\"glyphicon glyphicon-chevron-right\"></span>");
}

function nodeOver(node, i) {
    var hoverInfo = '<p class="text-center">' + node.Name + '</p>';
        hoverInfo += '<hr class="tooltip-hr">';
        hoverInfo += '<p class="text-center">' + dollarFormat(node.TotalAmount) + '</p>';

    d3.select("#hover-info").html(hoverInfo);
    d3.select("#hover-info").style("top", d3.event.y + 15 + "px")
                         .style("left", d3.event.x + 15 + "px")
                         .style("display", null);

    linkElements.style("stroke", function(l) {
        if (l.source === node || l.target === node) {
            return "#555";
        } else {
            return "#ddd";
        }
    }).style("stroke-opacity", function(l) {
        if (l.source === node || l.target === node) {
            return 1.0;
        } else {
            return 0.5;
        }
    });

    nodeElements.style("stroke", function(n) {
        if (n.searched) {
            return "#000";
        } else if (neighbours(node, n)) {
            return "#555";
        } else {
            return "#ddd";
        }
    }).style("stroke-width", function(n) {
        if (neighbours(node, n)) {
            return 2.0;
        } else {
            return 1.0;
        }
    });
}

function nodeOut(node, i) {
    d3.select("#hover-info").style("display", "none");
    linkElements.style("stroke", "#ddd")
                .style("stroke-opacity", 0.5)
    nodeElements.style("stroke", function(n) {
                    if (n.searched) {
                        return "#000";
                    } else {
                        return "#ddd";
                    }
                })
                .style("stroke-width", function(n) {
                    return 1.0;
                });
}

function neighbours(a, b) {
    if (a in madeLinks) {
        return (b in madeLinks[a]);
    }

    return false;
}

function selectAllParties(e) {
    var party_select = d3.select("#party_select").selectAll("option"),
        selected_parties = d3.select("#party_select").selectAll("option").filter(function(d) { return this.selected; });

    d3.event.preventDefault();
    if (party_select.size() != selected_parties.size()) {
        party_select.attr("selected", "selected");
        filterAndUpdateData();
    }
}

function selectAllYears(e) {
    var year_select = d3.select("#year_select").selectAll("option"),
        selected_years = d3.select("#year_select").selectAll("option").filter(function(d) { return this.selected; });

    d3.event.preventDefault();
    if (year_select.size() != selected_years.size()) {
        year_select.attr("selected", "selected");
        filterAndUpdateData();
    }
}

function selectAllReceiptTypes(e) {
    var receipt_type_select = d3.select("#receipt_type_select").selectAll("option"),
        selected_receipt_types = d3.select("#receipt_type_select").selectAll("option").filter(function(d) { return this.selected; });
    d3.event.preventDefault();
    if (receipt_type_select.size() != selected_receipt_types.size()) {
        receipt_type_select.attr("selected", "selected");
        filterAndUpdateData();
    }
}

function clearSearch(e) {
    d3.select("#search").property("value", "");
    d3.event.preventDefault();
    search();
}

function filterAndUpdateData() {
    var totals = {};

    drawLinks = [];
    drawNodes = [];

    madeLinks = {};

    selectedParties = [];
    selectedYears = [];
    selectedReceiptTypes = [];

    d3.select("#year_select").selectAll("option").filter(function(d) { return this.selected; }).each(function(d) { selectedYears.push(+this.value); });
    d3.select("#party_select").selectAll("option").filter(function(d) { return this.selected; }).each(function(d) { selectedParties.push(+this.value); });
    d3.select("#receipt_type_select").selectAll("option").filter(function(d) { return this.selected; }).each(function(d) { selectedReceiptTypes.push(+this.value); });

    var yearReceipts = receipts.filter(function(r) { return selectedYears.indexOf(+r.Year) != -1; }),
        allYearParties = d3.set(yearReceipts.map(function(r) { return +r.Party; })).values();

    var ids = {};
    allYearParties.forEach(function(d) { return ids[parties[d]] = d; });
    allYearParties = allYearParties.map(function(d) { return parties[d]; }).sort().map(function(d) { return +ids[d]; });

    if (selectedParties.length == 0) {
        selectedParties = allYearParties;
    }

    yearReceipts = yearReceipts.filter(function(r) { return (selectedReceiptTypes.indexOf(+r.Type) != -1) && (selectedParties.indexOf(+r.Party) != -1); });

    var yearParties = d3.set(yearReceipts.map(function(r) { return r.Party; })).values(),
        yearEntities = d3.set(yearReceipts.map(function(r) { return r.Entity; })).values(),
        i = 0;
    nodeIds = { entities: {}, parties: {} };

    var party_select = d3.select("#party_select").selectAll("option")
                             .data(allYearParties, function(d) { return parties[d]; });

    party_select.enter().append("option");
    party_select.attr("value", function(d) { return d; })
                .attr("selected", function(d) { return selectedParties.indexOf(+d) != -1 ? "selected" : null; })
                .text(function(d) { 
                    if (d == -1) {
                        return 'All Parties';
                    } else {
                        return parties[d]; 
                    }
                });
    party_select.exit().remove();

    yearParties.forEach(function(p) {
        var node = {
            Type: 'Party',
            Name: parties[p],
            TotalAmount: 0,
            links: [],
        };

        drawNodes.push(node);
        nodeIds.parties[p] = i;
        i++;
    });

    yearEntities.forEach(function(e) {
        var node = {
            Type: 'Entity',
            Name: entities[e].Name,
            TotalAmount: 0,
            links: [],
        };

        drawNodes.push(node);
        nodeIds.entities[e] = i;
        i++;
    });

    yearReceipts.forEach(function(r) {
        drawNodes[nodeIds['parties'][r.Party]].TotalAmount += +r.Amount;
        drawNodes[nodeIds['entities'][r.Entity]].TotalAmount += +r.Amount;

        var link = {
            source: nodeIds['entities'][r.Entity],
            target: nodeIds['parties'][r.Party]
        };

        var add = false;

        if (r.Entity in madeLinks) {
            if (madeLinks[r.Entity].indexOf(r.Party) == -1) {
                madeLinks[r.Entity].push(r.Party);
                add = true;
            }
        } else {
            madeLinks[r.Entity] = [r.Party, ];
            add = true;
        }


        if (add) {
            drawNodes[nodeIds['parties'][r.Party]].links.push(link);
            drawNodes[nodeIds['entities'][r.Entity]].links.push(link);

            drawLinks.push(link);
        }
    });

    draw();
    search();
}

function draw() {
    force.stop();
    force.nodes(drawNodes)
         .links(drawLinks);

    messageG.selectAll("text").remove();

    if (force.nodes().length == 0) {
        messageG.append("text")
                .attr("text-anchor", "middle")
                .attr("x", width/2)
                .attr("y", height/2)
                .text("No Data Found!")
        linksG.selectAll("line.link").remove();
        nodesG.selectAll("circle.node").remove();
        return;
    }

    radiusScale.domain(d3.extent(force.nodes(), function(n) { return n.TotalAmount; }));
    nodeColors.domain(force.nodes().map(function(n) { return n.Name; }));

    nodeElements = nodesG.selectAll("circle.node")
                       .data(force.nodes(), function(d, i) { 
                           return d.Name + "-" + i; 
                       });

    nodeElements.enter().append("circle").attr("class", "node");
    nodeElements.attr("r", function(n) { return radiusScale(n.TotalAmount); }).attr("id", function(d, i) { return i; })
                .style("stroke", "#ddd")
                .style("stroke-width", 1.0)
                .style("fill", function(d, i) { return nodeColors(d.Name); })
                .on("mouseover", nodeOver)
                .on("click", nodeClick)
                .on("mouseout", nodeOut);
    nodeElements.exit().remove();
    nodeElements.attr("title", function(n) { 
        return n.Name; 
    });


    linkElements = linksG.selectAll("line.link")
                       .data(force.links(), function(d) { return d.source + "-" + d.target; })

    linkElements.enter().append("line").attr("class", "link")
                                       .style("stroke", "#ddd")
                                       .style("stroke-width", 1.0)
                                       .style("stroke-opacity", 0.5);
    linkElements.exit().remove();

    force.start();

}

function tick() {
    linkElements.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

    nodeElements.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
}

function processData(error, data) {
    parties = data.parties;
    entities = data.entities;
    receipts = data.receipts;
    receipt_types = data.receipt_types;

    var years = getYears();

    selectedYears = [years[years.length-1], ];
    selectedReceiptTypes = d3.values(receipt_types);

    d3.select("#receipt_type_select").selectAll("option")
        .data(d3.keys(receipt_types))
      .enter().append("option")
        .attr("value", function(r) { return receipt_types[r]; })
        .attr("selected", "selected")
        .text(function(r) { return r; });


    d3.select("#year_select").selectAll("option")
        .data(d3.range(years[1], years[0]-1, -1))
      .enter().append("option")
        .attr("value", function(y) { return y; })
        .attr("selected", function(y) { return (y == years[1]) ? "selected" : null; })
        .text(function(y) { return y + " - " + (y+1); });

    svg = d3.select("div#vis").append("svg").attr("width", width).attr("height", height);
    svg.append("rect")
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr("width", width)
        .attr("height", height)
        .call(zoom);

    container = svg.append("g").attr("width", width).attr("height", height);
    linksG = container.append("g").attr("width", width).attr("height", height);
    nodesG = container.append("g").attr("width", width).attr("height", height);
    messageG = container.append("g").attr("width", width).attr("height", height);

    filterAndUpdateData();

    d3.select("#party_select").on("change", filterAndUpdateData);
    d3.select("#year_select").on("change", filterAndUpdateData);
    d3.select("#receipt_type_select").on("change", filterAndUpdateData);
    d3.select("#search").on("keyup", search);
}


