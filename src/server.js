//<-------Requiring dependencies--------->
const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const request = require('request')


const app = express();

//<--------connecting to postgreSql database--------->
const sequelize = new Sequelize('travelapp', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
    host: 'localhost',
    dialect: 'postgres',
    storage: './session.postgres'
})

app.use(express.static('../public'))
app.use(bodyParser.urlencoded({ extended: true }))

app.set('view engine', 'pug')
app.set('views', './views')

//<---------Session Store---------->
app.use(session({
    store: new SequelizeStore({
        db: sequelize,
        checkExpirationInteral: 15 * 60 * 1000,
        expiration: 24 * 60 * 60 * 1000
    }),
    secret: "safe",
    saveUninitialized: true,
    resave: false
}))


//<--------Multer----------->
const multer  = require('multer')
const myStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '../public/images/user-images')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
})
const upload = multer({ storage: myStorage });
 

//<------------Defining Models----------->
const Weathertype = sequelize.define('weathertypes',{
    city: Sequelize.STRING,
    type: Sequelize.STRING,
    from_date: Sequelize.DATEONLY,
    to_date: Sequelize.DATEONLY
},{
    timestamps: false
})



//<------------Default home page--------->
app.get('/',(req,res)=>{
	res.render('index')
})

//<--------search (POST)---------->
app.post('/search',(req,res)=>{
    let fromdate = req.body.fromdate;
    let todate = req.body.todate;
    let input = req.body.weatherType;
    let latitude = req.body.lat;
    let longitude = req.body.lng;
    console.log(`fromdate------>${fromdate}`)
    console.log(`location------->${latitude} ${longitude}`)

     let url = `http://api.geonames.org/findNearby?lat=${latitude}&lng=${longitude}&fcode=AIRP&radius=25&maxRows=100&username=mumtazakhtar`
    
   
    Weathertype.findAll({
        where:{
            type: input,
            from_date: { $lte: fromdate },
            to_date: {$gte: todate}
            
        }
    }).then(data=>{
        console.log(`data from database--------->${data}`)
       
        
        
       
        res.render('searchResults',{weathertype:input, data: data, fromdate:fromdate, todate:todate})

        })

})


// show flight results
 app.post('/flightSearch', function(req,res){
    var cityName = req.body.city;
    var fromdate = req.body.fromdate;
    var todate = req.body.todate;
    console.log(`from date-->${fromdate}`)

   let requesturl = 'https://api.klm.com/opendata/flightoffers/available-offers'

    request.post({
        url: requesturl,
        json: jsonData("AMS", "SYD", fromdate),
        headers: requestHeader()}, function(err, response, body){
            
          
        if(err){
            console.log("some error occured calling api")
        }
        else{

            // console.log("status" + response.statusCode);
            // console.log("body----->"+ JSON.stringify(body));
        //     var flightproducts = [];
        //     for(i=0; i<body.flightProducts; i++) {
        //       var flightDuration = body.flightProducts[i].connections[0].duration;
        //       var flightPrice = body.flightProducts[i].price.totalPrice;
        //       var responseSegments = body.flightProducts[i].connections[0].segments;
        //       var segments = [];
        //       console.log("response segments------->"+ JSON.stringify(responseSegments));
        //       console.log(`flight price-------->${flightPrice}`);
        //       for(j=0; j<responseSegments.length; j++){
        //         segments.push({
        //           arrivalTime: responseSegments[j].arrivalDateTime,
        //           departureTime: responseSegments[j].departureDateTime,
        //           destinationName: responseSegments[j].destination.name,
        //           destinationCity: responseSegments[j].destination.city.name,
        //           destinationCode: responseSegments[j].destination.code,
        //           carrierName: responseSegments[j].marketingFlight.operatingFlight.carrier.name,
        //           originName: responseSegments[j].origin.name,
        //           originCity: responseSegments[j].origin.city.name
        //         });

        //        console.log("origin city" + JSON.stringify(originCity));

        //       }
        //     }
        //       flightproducts.push({
        //         duration : flightDuration,
        //         segments : segments,
        //         price: flightPrice
        //       });
            

        // }
            var flightDuration = Math.floor((body.flightProducts[0].connections[0].duration)/60);
            var responseSegments = body.flightProducts[0].connections[0].segments;
            var price = body.flightProducts[0].price.totalPrice;
            var segments = [];
            for(i=0; i < responseSegments.length; i++){
              segments.push({
                arrivalTime: responseSegments[i].arrivalDateTime,
                departureTime: responseSegments[i].departureDateTime,
                destinationName: responseSegments[i].destination.name,
                destinationCity: responseSegments[i].destination.city.name,
                destinationCode: responseSegments[i].destination.code,
                carrierName: responseSegments[i].marketingFlight.operatingFlight.carrier.name,
                originName: responseSegments[i].origin.name,
                originCity: responseSegments[i].origin.city.name
              });
            }
            
           var flight = {
            duration : flightDuration,
            segments : segments,
            price: price
           }
        
    
      }
    console.log(`segments----->${segments}`)
    // console.log("input selected----->" + JSON.stringify(flightproducts));
  
    res.render('flightResults', {flight:flight, cityName:cityName})
  })
 })   

//Json method
function jsonData(currentLocation, destination, departureDate){ 

    return {
  "cabinClass":"ECONOMY",
  "discountCode":"",
  "passengerCount":{
    "YOUNG_ADULT":0,
    "INFANT":0,
    "CHILD":0,
    "ADULT":1
  },
  "currency":"EUR",
  "minimumAccuracy":"",
  "requestedConnections":[
    {
      "origin":{
        "airport":{
          "code":currentLocation
        }
      },
      "destination":{
        "airport":{
          "code":destination
        }
      },
      "departureDate":departureDate
    }
  ],
  "shortest":true
  }

}

// request header
function requestHeader(){
    return {
        "Afkl-Travel-Country": "NL",
        "Accept": "application/hal+json;charset=utf8",
        "Afkl-Travel-Host": "KL",
        "Accept-Language": "en-US",
        "Api-Key": "5e2t4d2zyeze8hcma6j4ep9n",
        "Content-Type": "application/json"
    }
}





sequelize.sync()

//<---------Port---------->
app.listen(4000, function(){
	console.log("app listening at port 4000")
})