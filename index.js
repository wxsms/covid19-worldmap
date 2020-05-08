document.addEventListener('DOMContentLoaded', function (event) {
  // sizes
  const margin = { top: 0, right: 0, bottom: 0, left: 0 }
  const width = 960 - margin.left - margin.right
  const height = 500 - margin.top - margin.bottom

  // svg setup
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('class', 'map')

  // projection setup
  const projection = d3.geoRobinson()
    .scale(148)
    .rotate([352, 0, 0])
    .translate([width / 2, height / 2])
  const path = d3.geoPath().projection(projection)

  // tooltips setup
  const tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(d => `<strong>Country: </strong><span class='details'>${d.properties.name}<br></span><strong>Confirmed cases: </strong><span class='details'>${d.case}</span>`)
  svg.call(tip)

  // load datas before init
  Promise.all([
    d3.json('./data/world_countries.json'),
    d3.json('./data/map-data.json'),
    d3.json('./data/iso3.json')
  ]).then((res) => {
    // world data for map drawing
    const world = res[0]
    // covid19 data
    const data = res[1].data
      .map(v => {
        v.id = res[2][v.countrycode]
        v.cases = parseInt(v.cases)
        return v
      })

    const rates = data.map(v => v.cases)
    const maxRate = Math.max(...rates)
    const minRate = Math.min(...rates)
    const step = (maxRate - minRate) / 9
    const color = d3.scaleThreshold()
      .domain([
        minRate,
        minRate + step,
        minRate + step * 2,
        minRate + step * 3,
        minRate + step * 4,
        minRate + step * 5,
        minRate + step * 6,
        minRate + step * 7,
        minRate + step * 8,
        maxRate
      ])
      .range([
        'rgb(247,251,255)',
        'rgb(222,235,247)',
        'rgb(198,219,239)',
        'rgb(158,202,225)',
        'rgb(107,174,214)',
        'rgb(66,146,198)',
        'rgb(33,113,181)',
        'rgb(8,81,156)',
        'rgb(8,48,107)',
        'rgb(3,19,43)'
      ])

    const dates = data
      .map(v => v.date)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => new Date(a) - new Date(b))
    let selectedDate = dates[0]

    function redraw () {
      svg.selectAll('g.countries').remove()

      const dataByName = {}
      const dataByDate = data.filter(v => v.date === selectedDate)
      dataByDate.forEach(v => { dataByName[v.id] = v.cases })
      world.features.forEach(d => {d.case = typeof dataByName[d.id] === 'number' ? dataByName[d.id] : 0})

      svg
        .append('g')
        .attr('class', 'countries')
        .selectAll('path')
        .data(world.features)
        .enter().append('path')
        .attr('d', path)
        .style('fill', d => dataByName[d.id] ? color(dataByName[d.id]) : '#eee')
        .style('stroke', 'white')
        .style('opacity', 0.8)
        .style('stroke-width', 0.3)
        .on('mouseover', function (d) {
          tip.show(d, this)
          d3.select(this)
            .style('opacity', 1)
            .style('stroke-width', 3)
        })
        .on('mouseout', function (d) {
          tip.hide(d)
          d3.select(this, this)
            .style('opacity', 0.8)
            .style('stroke-width', 0.3)
        })
    }

    redraw()

    let tickIndex = 0
    const slider = d3
      .sliderRight()
      .max(dates.length - 1)
      .tickValues(Array.from(dates.keys()))
      .step(1)
      .height(400)
      .default(0)
      .tickFormat(d => ++tickIndex % 10 === 0 ? dates[d] : null)
      .displayFormat(d => dates[d])
      .on('onchange', d => {
        selectedDate = dates[d]
        redraw()
      })

    svg
      .append('g')
      .attr('transform', 'translate(30,30)')
      .call(slider)
  })
})
