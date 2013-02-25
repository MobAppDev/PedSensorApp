      function sensorClass() {
        this.accel= {
            Available: false,
            Enabled: false,
            intervalId: 0,
            getReadingInterval: 0,
            accelerometer: null,
            x: 0,
            y: 0,
            z: 0,
        },
        this.gyro= {
            Available: false,
            Enabled: false,
            intervalId: 0,
            getReadingInterval: 0,
            gyrometer: null,
            x: 0,
            y: 0,
            z: 0,
        },
        this.compass = {
            Available: false,
            cEnabled: false,
            intervalId: 0,
            getReadingInterval: 0,
            compassdevice: null,
            magNorth: 0,
            trueNorth: 0,
        },
        this.gps= {
            Available: false,
            Enabled: false,
            intervalId: 0,
            getReadingInterval: 0,
            gpsdevice: null,
            longitude: 0.0,
            latitude: 0.0,
            accuracy: 0.0,
        }

        }

        var SensorState = new sensorClass();

        function calStateClass() {
            this.longitude = 0.0,
                this.latitude = 0.0,
                this.accuracy = 0.0,
                this.x = 0.0,
                this.y = 0.0,
                this.z = 0.0,
                this.orientation = 0,      //0 is in  initial y direction
                this.calibratedorient = 0,  //compass angle at calibration
                this.fwdmotion = {
                    Available: false,
                    Enabled: false,
                    distancesinceturn: 0.0,
                    x: 0,
                    y: 0,
                    z: 0,
                },
                this.turndetect = {
                    Available: false,
                    Enabled: false,
                    turnsincemotion: 0.0,
                    x: 0,
                    y: 0,
                    z: 0,
                },
                this.goodgps = {
                    longitude: 0.0,
                    latitude: 0.0,
                    accuracy: 0.0,
                }
        }
        var CalculatedState = new calStateClass();

var getReadingInterval = 16;
var DebugMessageRow = 0;
var MotionLogRow = 0;
var MotionLogColumn = 0;
var ModeButtonState = 0;   // 0 = Indoor  1 = Outdoor
var TurnMode = 0   // 0 = Snap    1 = Variable
var Stride = 0.5;  //in meters
var MotionType = 0;        // 0 = Step    1 = Linear
var debugmsgen = true;
var motionmsgen = true;
var posdone = 0;
var posnotdone = 1;
var poshandler = posdone;
var gpschanged = false;
var gpsthreshold = 16; //accuracy
var Rearth = 6371000;// radius of earth meters
var forcegpsuse = false;
var gpsinterval = 5;
var gpsturn = 0;

function AddTapMessageRow(message) {
    if (debugmsgen) {
        DebugMessageRow++;
        var t = document.getElementById('debugTable');
        var x = t.insertRow(DebugMessageRow);
        var y = x.insertCell(0);

        y.innerHTML = DebugMessageRow.toString() + " " + message;
        var m = document.getElementById('DebugMessages');
        m.scrollTop = m.scrollHeight;
    }
}


function Cleardebugtable() {
    while (DebugMessageRow) { document.getElementById('debugTable').deleteRow(DebugMessageRow); DebugMessageRow--; }
    document.getElementById('debugTable').rules = "rows";
}


function AddMotionLogRow(message, message2) {
    if (motionmsgen) {
        MotionLogRow++;
        var t = document.getElementById('motionlogTable');
        LastRow = t.insertRow(MotionLogRow);
        Column1 = LastRow.insertCell(0);
        Column2 = LastRow.insertCell(1);

        Column1.innerHTML = MotionLogRow.toString() + " " + message;
        Column2.innerHTML = "   " + message2;
        var m = document.getElementById('MotionLog');
        m.scrollTop = m.scrollHeight;
    }
}


function UpdateMotionLogLastRow(message, message2) {
    if (motionmsgen) {
        if (MotionLogRow > 0) {
            Column1.innerHTML = MotionLogRow.toString() + " " + message;
            Column2.innerHTML = "   " + message2;
            var m = document.getElementById('MotionLog');
            m.scrollTop = m.scrollHeight;
        }
    }
}

function ClearmotionLogTable() {
    while (MotionLogRow) { document.getElementById('motionlogTable').deleteRow(MotionLogRow); MotionLogRow--; }
    document.getElementById('motionlogTable').rules = "rows";
}


function getSliderValue(sliderID) {
    var t = document.getElementById(sliderID);
    return parseFloat(t.textContent);
}


    var threshold = 10;
    //var steps = 0;
    var loa = 1.0;
    var hia = 1.0;
    var preva = 0;
    var avga = 0;
    var numsamples = 20;
    var samples = 0;
    var trend = 0;
    var up = 1; down = -1;
    var notfound = "not found";
    var deviceon = "on";
    var deviceoff = "off";
    var modeIndoor = "Indoor";
    var modeOutdoor = "Outdoor";
    var turnsSnap = "Snap";
    var turnsVariable = "Variable";
    var motionTypeStep = "Step";
    var motionTypeLinear = "Linear";
    var devicesPolled = 0;
    var intervalId = 0;
    var LastRow = 0;
    var Column1 = 0
    var Column1 = 1;
    var oldSteps = 0;


    /*
    function ChangeMotionLogLastCell(message) {
        var t = document.getElementById('motionlogTable');
        var x = t.insertRow(MotionLogRow);
        var y = x.insertCell(0);
        var z = x.insertCell(1);

        y.innerHTML = MotionLogRow.toString() + " " + message;
        z.innerHTML = MotionLogRow.toString() + " " + message2;
        var m = document.getElementById('MotionLog');
        m.scrollTop = m.scrollHeight;
    }
*/


 
    function forwardmotiondetect() {
        if (MotionType == 1) linearmotiondetect();
        if (MotionType == 0) stepmotiondetect();
        /* need to do some more processing here to combine the data and provide final output in the table */

        var incfwdpos = ((steps - oldSteps) * Stride);
        CalculatedState.fwdmotion.distancesinceturn += incfwdpos;

        if (steps != oldSteps) {
            if (CalculatedState.turndetect.turnsincemotion != 0) {
                AddMotionLogRow("STEPS ", CalculatedState.fwdmotion.distancesinceturn + "m");
                CalculatedState.turndetect.turnsincemotion = 0;
            }
            else
                UpdateMotionLogLastRow("STEPS ", CalculatedState.fwdmotion.distancesinceturn + "m");
            updatexyz(incfwdpos);
            oldSteps = steps;
        }
    }
    function updateOrientation(angle) {
        CalculatedState.orientation += angle;
        CalculatedState.orientation %= 360;
        if (Math.abs(CalculatedState.orientation) >= 180) {
            if (CalculatedState.orientation > 180) {
                CalculatedState.orientation -= 360;
            } else if (CalculatedState.orientation <= -180) {
                CalculatedState.orientation += 360;
            }
        }
        document.getElementById('worldo').innerHTML = CalculatedState.orientation;
    }
    function turndetect() {
        turnfromgyro();
        //turnfromcompass();
        /* need to do some more processing here to combine the data and provide final output in the table */
        if (finished_turn) {
            CalculatedState.turndetect.turnsincemotion = finished_turn;
            finished_turn = 0;
            AddMotionLogRow("TURN ", CalculatedState.turndetect.turnsincemotion + "deg");
            updateOrientation(CalculatedState.turndetect.turnsincemotion);
            CalculatedState.fwdmotion.distancesinceturn = 0.0;
        }
    }
    function cleangpsOutput() {
        document.getElementById('gps_status').innerHTML = " ";
        document.getElementById('latitude').innerHTML = "waiting...";
        document.getElementById('longitude').innerHTML = "waiting...";
        document.getElementById('accuracy').innerHTML = "waiting...";

    }

    function getPositionHandler(pos) {
        //alert("get pos");
        if (pos) {
            if ((SensorState.gps.latitude == pos.coords.latitude) && (SensorState.gps.longitude == pos.coords.longitude)) {
                gpschanged = false;
            }
            else {
                SensorState.gps.latitude = pos.coords.latitude;
                SensorState.gps.longitude = pos.coords.longitude;
                SensorState.gps.accuracy = pos.coords.accuracy;
                document.getElementById('latitude').innerHTML = SensorState.gps.latitude.toFixed(6);
                document.getElementById('longitude').innerHTML = SensorState.gps.longitude.toFixed(6);
                document.getElementById('accuracy').innerHTML = SensorState.gps.accuracy;
                gpschanged = true;
                if (SensorState.gps.accuracy > gpsthreshold) {
                    document.getElementById("position_status").textContent = ("position not accurate");
                }
                else {
                    document.getElementById("position_status").textContent = ("position accurate");
                }
                document.getElementById("gps_status").textContent = (" ");
            }
        } else {
            document.getElementById("gps_status").textContent = ("no position fix");
        }
        poshandler = posdone;
    }

    function getPositionErrorHandler(err) {
        document.getElementById("gps_status").textContent = err.message;
        poshandler = posdone;
    }
    function getloc() {
       // cleangpsOutput();

        //SensorState.gps.gpsdevice.addEventListener("positionchanged", ongpsPositionChanged);
        //SensorState.gps.gpsdevice.addEventListener("statuschanged", ongpsStatusChanged);
        poshandler = posnotdone; gpsturn = 0;
        SensorState.gps.gpsdevice.getCurrentPosition(getPositionHandler, getPositionErrorHandler);
    }
    function cleancalcgpsOutput() {
        //document.getElementById('gps_status').innerHTML = " ";
        document.getElementById('calclatitude').innerHTML = "waiting...";
        document.getElementById('calclongitude').innerHTML = "waiting...";
        //document.getElementById('accuracy').innerHTML = "waiting...";

    }
    function showcalcgpsOutput() {
        //document.getElementById('gps_status').innerHTML = " ";
        document.getElementById('calclatitude').innerHTML = CalculatedState.latitude.toFixed(6);
        document.getElementById('calclongitude').innerHTML = CalculatedState.longitude.toFixed(6);
        //document.getElementById('accuracy').innerHTML = "waiting...";

    }
    function resetmotionduetonewgpsfix() {
        reset_step(); oldSteps = 0;
        //accelYinit();
        //initcompass();
        initgyro();
        clearcalculatedstate();
    }
    function GPSfixdetect() {
        if (gpschanged || forcegpsuse) {
            if ((SensorState.gps.accuracy <= gpsthreshold)|| forcegpsuse) {
                CalculatedState.goodgps.latitude = SensorState.gps.latitude;
                CalculatedState.goodgps.longitude = SensorState.gps.longitude;
                CalculatedState.goodgps.accuracy = SensorState.gps.accuracy;
                resetmotionduetonewgpsfix();
                CalculatedState.calibratedorient = SensorState.compass.magNorth;
                document.getElementById('bearing').innerHTML = CalculatedState.calibratedorient;
                if (forcegpsuse) {
                    toggleforcegpsMode();
                }
            }

            gpschanged = false;

        }
    }
    function showxyz() {
        document.getElementById('worldx').innerHTML = CalculatedState.x;
        document.getElementById('worldy').innerHTML = CalculatedState.y;
        document.getElementById('worldz').innerHTML = CalculatedState.z;

    }
    function clearxyz() {
        CalculatedState.x = 0;
        CalculatedState.y = 0;
        CalculatedState.z = 0;
        showxyz();
    }


    function clearcalculatedstate() {
        clearxyz();
        updateOrientation(-CalculatedState.orientation);
        CalculatedState.calibratedorient = SensorState.compass.magNorth;
        CalculatedState.turndetect.turnsincemotion = 0;
        CalculatedState.fwdmotion.distancesinceturn = 0;
    }

    function updatexyz(incfwdpos) {
        if (CalculatedState.orientation == 0) {
            CalculatedState.y += incfwdpos;
        } else if (CalculatedState.orientation == 90) {
            CalculatedState.x += incfwdpos;
        } else if (CalculatedState.orientation == -90) {
            CalculatedState.x -= incfwdpos;
        } else if (CalculatedState.orientation == 180) {
            CalculatedState.y -= incfwdpos;

        }
        CalculatedState.z = 0;
        showxyz();
    }

    function calcnewgps(lon1, lat1, d, brng) { // formula From
        //  http://www.movable-type.co.uk/scripts/latlong.html#destPoint
        var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / Rearth) +
                             Math.cos(lat1) * Math.sin(d / Rearth) * Math.cos(brng));
        var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / Rearth) * Math.cos(lat1),
                                     Math.cos(d / Rearth) - Math.sin(lat1) * Math.sin(lat2));
        return { longitude: lon2, latitude: lat2 };
    }
    function calculatefix() {
/*        if (CalculatedState.orientation == 0) {

        } else if (CalculatedState.orientation == 90) {

        } else if (CalculatedState.orientation == -90) {

        } else if (CalculatedState.orientation == 180) {

        }*/
        var d = Math.sqrt(Math.pow(CalculatedState.x, 2) + Math.pow(CalculatedState.y, 2));
        var brng = Math.atan2(CalculatedState.y, CalculatedState.x) + CalculatedState.calibratedorient * Math.PI / 180;
        var longlat = calcnewgps(CalculatedState.goodgps.longitude * Math.PI / 180, CalculatedState.goodgps.latitude * Math.PI / 180, d, brng)
        CalculatedState.longitude = longlat.longitude * 180 / Math.PI;
        CalculatedState.latitude = longlat.latitude * 180 / Math.PI;
        CalculatedState.accuracy = CalculatedState.goodgps.accuracy;
        showcalcgpsOutput();
    }

    function ProcessData() {
        if (SensorState.accel.Enabled)
            forwardmotiondetect();
        if (SensorState.gyro.Enabled)
            turndetect();
        if (SensorState.gps.Enabled)
            GPSfixdetect();
        calculatefix();

    }

function orientationHandler(e)
{
    alert("orientationHandler");
   var x, y, z;
    x = document.getElementById('gyroOutputX').innerHTML = e.beta;
    y = document.getElementById('gyroOutputY').innerHTML = e.gamma;
    z = document.getElementById('gyroOutputZ').innerHTML = e.alpha;
    SensorState.gyro.x = parseFloat(x);
    SensorState.gyro.y = parseFloat(y);
    SensorState.gyro.z = parseFloat(z);
}


    function getCurrentReading() {
        var x, y, z, reading;
        if (SensorState.accel.Enabled) {
            SensorState.accel.accelerometer.getCurrentAcceleration(onSuccess, onError);
        }
        if (SensorState.gyro.Enabled) {
            reading = SensorState.gyro.gyrometer.getCurrentReading();
            if (reading) {
                x = document.getElementById('gyroOutputX').innerHTML = reading.angularVelocityX.toFixed(2);
                y = document.getElementById('gyroOutputY').innerHTML = reading.angularVelocityY.toFixed(2);
                z = document.getElementById('gyroOutputZ').innerHTML = reading.angularVelocityZ.toFixed(2);
                SensorState.gyro.x = parseFloat(x);
                SensorState.gyro.y = parseFloat(y);
                SensorState.gyro.z = parseFloat(z);
            }
        }
        if (SensorState.compass.Enabled) {
            SensorState.compass.compassdevice.getCurrentHeading(onCompassSuccess, onError);;
        }
        if (SensorState.gps.Enabled) {
           // gpschanged = false;
            if (poshandler == posdone) {
                if (gpsturn++ > gpsinterval) getloc();
            }
        }
        ProcessData();
    }

    function onSuccess(acceleration) {
        if (SensorState.accel.Enabled) {
            x = document.getElementById('accelOutputX').innerHTML = acceleration.x;
            y = document.getElementById('accelOutputY').innerHTML = acceleration.y;
            z = document.getElementById('accelOutputZ').innerHTML = acceleration.z;
            SensorState.accel.x = parseFloat(x);
            SensorState.accel.y = parseFloat(y);
            SensorState.accel.z = parseFloat(z);
        }
    }
    function onCompassSuccess(heading) {
        if (SensorState.compass.Enabled) {
           // alert("onCompass");
           // alert(heading.magneticHeading);
           // alert(heading.headingMagneticNorth);
            var magnorth = document.getElementById('magneticNorth').innerHTML = heading.magneticHeading.toFixed(2);
            SensorState.compass.magNorth = parseFloat(magnorth);
           // alert(SensorState.compass.magNorth);
           // if (heading.headingTrueNorth) {
           //     var truenorth = document.getElementById('trueNorth').innerHTML = heading.headingTrueNorth.toFixed(2);
           //     SensorState.compass.trueNorth = parseFloat(truenorth);
          //  } else {
                document.getElementById('trueNorth').innerHTML = "no data";
          //  }
        }
    }

    function onError() {
      //  alert('onError!');
    }

    function enableInterval() {
        if (devicesPolled == 0)
            intervalId = setInterval(getCurrentReading, getReadingInterval);
        devicesPolled++;
    }

    function disableInterval() {
        if (devicesPolled == 1)
            clearInterval(intervalId);
        devicesPolled--;
    }


    function toggleAccelerometer() {
        if (SensorState.accel.Available) {
            if (SensorState.accel.Enabled) {
                SensorState.accel.Enabled = false;
                disableInterval();
                document.getElementById("accelStatus").textContent = deviceoff;
                document.getElementById("AccelEnable").style.background = 'Gray';
                // ClearmotionLogTable(); //debug only
            }
            else {
                SensorState.accel.Enabled = true;
                enableInterval();
                document.getElementById("accelStatus").textContent = deviceon;
                document.getElementById("AccelEnable").style.background = 'Green';
                
            }
        }
    }
    function toggleGyrometer() {
        if (SensorState.gyro.Available) {
            if (SensorState.gyro.Enabled) {
                SensorState.gyro.Enabled = false;
                disableInterval();
                document.getElementById("gyroStatus").textContent = deviceoff;
                document.getElementById("GyroEnable").style.background = 'Gray';
                //   disableGyro();
            }
            else {
                SensorState.gyro.Enabled = true;
                enableInterval();
                document.getElementById("gyroStatus").textContent = deviceon;
                document.getElementById("GyroEnable").style.background = 'Green';
                //    enableGyro();
            }
        }
    }
    function toggleCompass() {
        if (SensorState.compass.Available) {
            if (SensorState.compass.Enabled) {
                SensorState.compass.Enabled = false;
                disableInterval();
                document.getElementById("compassStatus").textContent = deviceoff;
                document.getElementById("CompassEnable").style.background = 'Gray';
                //   disableCompass();
            }
            else {
                SensorState.compass.Enabled = true;
                enableInterval();
                document.getElementById("compassStatus").textContent = deviceon;
                document.getElementById("CompassEnable").style.background = 'Green';
                //   enableCompass();
            }
        }
    }
    function toggleGPS() {
        if (SensorState.gps.Available) {
            if (SensorState.gps.Enabled) {
                SensorState.gps.Enabled = false;
                disableInterval();
                document.getElementById("gpsStatus").textContent = deviceoff;
                document.getElementById("GPSEnable").style.background = 'Gray';

                //disableGPS();
            }
            else {
                SensorState.gps.Enabled = true;
                enableInterval();
                document.getElementById("gpsStatus").textContent = deviceon;
                document.getElementById("GPSEnable").style.background = 'Green';
                // enableGPS();
            }
        }
    }




    function onSliderStrideChanged(value) {
        var t = document.getElementById('sliderStride');
        Stride = t.textContent = value;
    }


    function onMySliderOneChanged(value) {
        var t = document.getElementById('sliderLabel1');
        t.textContent = value;
    }


    function onMySliderTwoChanged(value) {
        var t = document.getElementById('sliderLabel2');
        t.textContent = value;
    }

    function onGyroThresholdSliderChanged(value) {
        var t = document.getElementById('turn_thresholdLabel');
        t.textContent = value;

        turn_threshold = value;
    }


    function Reset() {
        //      initialize();
        reset_step(); oldSteps = 0;
        accelYinit();
        initcompass();
        initgyro();
        clearcalculatedstate();

    //    Cleardebugtable();
    //    ClearmotionLogTable();
    //    AddMotionLogRow(" ", " ");
        //        Samples between peaks
        //Min peak to peak distance

        // To reset controls back to original values uncomment the following code.
        /*      document.getElementById("StrideRange").value = 2.0;
        document.getElementById('sliderStride').textContent = "2.0";
        document.getElementById("pollRateSelect").value = 16;
        ModeButtonState = 0;   // 0 = Indoor  1 = Outdoor
        document.getElementById("modeLabel").textContent = modeIndoor;
        TurnMode = 0;
        document.getElementById("turnLabel").textContent = turnsSnap;
        MotionType = 0;
        document.getElementById("motionTypeLabel").textContent = motionTypeStep;*/
    }
    function toggledebugmsgMode() {
        debugmsgen = !debugmsgen;
        if (!debugmsgen) {
            document.getElementById("debuglogvalue").textContent = deviceoff;
        }
        else {
            document.getElementById("debuglogvalue").textContent = deviceon;
        }
    }

    function toggleforcegpsMode() {
        forcegpsuse = !forcegpsuse;
        if (!forcegpsuse) {
            document.getElementById("forcegpsvalue").textContent = "oneshot";
        }
        else {
            document.getElementById("forcegpsvalue").textContent = deviceon;
        }
    }

    function togglemotionmsgMode() {
        motionmsgen = !motionmsgen;
        if (!motionmsgen) {
            document.getElementById("motionlogvalue").textContent = deviceoff;
        }
        else {
            document.getElementById("motionlogvalue").textContent = deviceon;
        }
    }

    function toggleMode() {
        ModeButtonState = !ModeButtonState;
        if (!ModeButtonState) {
            document.getElementById("modeLabel").textContent = modeIndoor;
        }
        else {
            document.getElementById("modeLabel").textContent = modeOutdoor;
        }
    }



    function toggleTurns() {
        TurnMode = !TurnMode;
        if (!TurnMode) {
            document.getElementById("turnLabel").textContent = turnsSnap;
        }
        else {
            document.getElementById("turnLabel").textContent = turnsVariable;
        }
    }


    function toggleMotionType() {
        MotionType = !MotionType;
        if (!MotionType) {
            document.getElementById("motionTypeLabel").textContent = motionTypeStep;
        }
        else {
            document.getElementById("motionTypeLabel").textContent = motionTypeLinear;
        }
    }


    function onSelectPollRate(value) {
        getReadingInterval = value;
    }


    function Calibrate() {
        updateOrientation(-CalculatedState.orientation);

    }



    function initialize() {

        document.getElementById('AccelEnable').addEventListener('click', /*@static_cast(EventListener)*/toggleAccelerometer, false);
        document.getElementById('GyroEnable').addEventListener("click", /*@static_cast(EventListener)*/toggleGyrometer, false);
        document.getElementById('CompassEnable').addEventListener("click", /*@static_cast(EventListener)*/toggleCompass, false);
        document.getElementById('GPSEnable').addEventListener("click", /*@static_cast(EventListener)*/toggleGPS, false);
        document.getElementById('ButtonReset').addEventListener("click", /*@static_cast(EventListener)*/Reset, false);
        document.getElementById('ButtonMode').addEventListener("click", /*@static_cast(EventListener)*/toggleMode, false);
        document.getElementById('ButtonTurns').addEventListener("click", /*@static_cast(EventListener)*/toggleTurns, false);
        document.getElementById('ButtonMotionType').addEventListener("click", /*@static_cast(EventListener)*/toggleMotionType, false);
        document.getElementById('CalibrateButton').addEventListener("click", /*@static_cast(EventListener)*/Calibrate, false);
        document.getElementById('DebugLogButton').addEventListener("click", /*@static_cast(EventListener)*/toggledebugmsgMode, false);
        document.getElementById('ForceGPScoorduse').addEventListener("click", /*@static_cast(EventListener)*/toggleforcegpsMode, false);
        document.getElementById('MotionLogButton').addEventListener("click", /*@static_cast(EventListener)*/togglemotionmsgMode, false);
        // document.getElementById("scenario3Open").disabled = false;
        // document.getElementById("scenario3Revoke").disabled = true;
        // document.getElementById("scenarios").addEventListener("change", /*@static_cast(EventListener)*/resetAll, false);
        
      //  var accelerometer = Windows.Devices.Sensors.Accelerometer.getDefault();
        var accelerometer = navigator.accelerometer;
        SensorState.accel.accelerometer = accelerometer;
        if (SensorState.accel.accelerometer) {
            // Choose a report interval supported by the sensor
            var minimumReportInterval = SensorState.accel.accelerometer.minimumReportInterval;
            var reportInterval = minimumReportInterval > 16 ? minimumReportInterval : 16;
            SensorState.accel.accelerometer.reportInterval = reportInterval;
            SensorState.accel.getReadingInterval = reportInterval;
            getReadingInterval = reportInterval > getReadingInterval ? reportInterval : getReadingInterval;
            SensorState.accel.Available = true;
        } else {
            SensorState.accel.Available = false;
            document.getElementById("accelStatus").textContent = notfound;
        }

        var gps = navigator.geolocation; //new Windows.Devices.Geolocation.Geolocator();
        SensorState.gps.gpsdevice = gps;
        if (gps) {
            SensorState.gps.Available = true;
        }
        else {
            document.getElementById("gpsStatus").textContent = notfound;
        }

        var compass = navigator.compass;//Windows.Devices.Sensors.Compass.getDefault();
        SensorState.compass.compassdevice = compass;
        if (compass) {
            // Choose a report interval supported by the sensor
            var minimumReportInterval = compass.minimumReportInterval;
            var reportInterval = minimumReportInterval > 16 ? minimumReportInterval : 16;
            // compass.reportInterval = reportInterval;
            SensorState.compass.getReadingInterval = reportInterval;
            getReadingInterval = reportInterval > getReadingInterval ? reportInterval : getReadingInterval;
            SensorState.compass.Available = true;
        } else {
            SensorState.compass.Available = false;
            document.getElementById("compassStatus").textContent = notfound;
        }
        alert("the device is"+ device.platform);
      
       
        Reset();
        var pollRateSelection = document.getElementById("pollRateSelect");
        pollRateSelection.addEventListener("change", function (e) {
            onSelectPollRate(pollRateSelection.value);
        }, false);

        var LocalStrideSlider = document.getElementById("StrideRange");
        LocalStrideSlider.addEventListener("change", function (e) {
            onSliderStrideChanged(LocalStrideSlider.value);
        }, false);

        var MySliderOne = document.getElementById("samplesSlider1");
        MySliderOne.addEventListener("change", function (e) {
            onMySliderOneChanged(MySliderOne.value);
        }, false);

        var MySliderTwo = document.getElementById("samplesSlider2");
        MySliderTwo.addEventListener("change", function (e) {
            onMySliderTwoChanged(MySliderTwo.value);
        }, false);

        var GyrothresholdSlider = document.getElementById("turn_thresholdslider");
        GyrothresholdSlider.addEventListener("change", function (e) {
            onGyroThresholdSliderChanged(GyrothresholdSlider.value);
        }, false);



        var loggingDurationSelect = document.getElementById("pollRateSelect");
        var loggingDuration = loggingDurationSelect.options[loggingDurationSelect.selectedIndex].value * 1000;
        
        
        if(device.platform == 'Android'){
          alert("Method check last1~~~~~~~~~~~~~~~~~~~~~~~");
          SensorState.gyro.Available = true;
          if (window.DeviceOrientationEvent) {
              window.addEventListener('deviceorientation', orientationHandler, false);
          }
        }
       /*   var gyrometer = Windows.Devices.Sensors.Gyrometer.getDefault();
        SensorState.gyro.gyrometer = gyrometer;
        if (SensorState.gyro.gyrometer) {
            // Choose a report interval supported by the sensor
            var minimumReportInterval = SensorState.gyro.gyrometer.minimumReportInterval;
            var reportInterval = minimumReportInterval > 16 ? minimumReportInterval : 16;
            SensorState.gyro.gyrometer.reportInterval = reportInterval;
            SensorState.gyro.getReadingInterval = reportInterval;
            getReadingInterval = reportInterval > getReadingInterval ? reportInterval : getReadingInterval;
            SensorState.gyro.Available = true;
        } else {
            SensorState.gyro.Available = false;
            document.getElementById("gyroStatus").textContent = notfound;
        }*/
          alert("Method check last~~~~~~~~~~~~~~~~~~~~~~~");
       
    }
