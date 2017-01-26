app.controller("secondCtrl", function($scope, socketFactory, chatFactory, $rootScope) {

    //Variables globales
    var marker;
    var circlesData;
    var areasDisplay = false;
    $scope.myLatLngGlobal;
    $scope.enigma = {'title': "", 'text' : "", 'photo' : ""};
    $scope.reponseEnigma = "";


    //$scope functions
    $scope.sendAnswer = sendAnswer;
    $scope.askClue = askClue;
    $scope.onCloseModal = onCloseModal;
    $scope.openEnigma = openEnigma;

    //Fonctions appelées au lancement
    googleMapInit();
    GPSTracker();

    //============================================================================
    //======                        Google map                              ======
    //============================================================================

    //TODO zone pas à tout les coups
    /**
     * Initialise la google map
     */
     function googleMapInit() {
        var myLatLng = {lat: 43, lng: 7};

        map = new google.maps.Map(document.getElementById('map'), {
            center: myLatLng,
            zoom: 8
        });

        marker = new google.maps.Marker({
            map: map
        });

        //Popup
        var infowindow = new google.maps.InfoWindow({
            content: "Vous êtes ici !"
        });

        //Link marker and popup
        marker.addListener('click', function() {
            infowindow.open(map, marker);
        });

        socketFactory.askAreas();
    }

    /**
     * Ajoute un cercle sur la google map
     * @param radius
     * @param lat
     * @param lng
     */
     function addCircleFunc(radius, lat, lng) {
        console.log("Nouvelle zone ajoutée !");
        var cityCircle = new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: map,
            center: {lat: lat, lng: lng},
            radius: radius
        });
    }

    //============================================================================
    //======                             GPS                                ======
    //============================================================================

    /**
    * Récupère la position en temps réel de l'utilisateur
    * La transmet au serveur
    * Et vérifie à chaque déplacement si l'utilisateur est dans une zone
    */
    function GPSTracker() {
        //Vérifie que la géolocalisation est disponible
        if (navigator.geolocation) {
            navigator.geolocation.clearWatch($rootScope.watchId);
            console.log(navigator.geolocation);
            //Actualise à chaque déplacement
            $rootScope.watchId = navigator.geolocation.watchPosition(function (position) {
                console.log('Position utilisateur : ' + position.coords.latitude,  position.coords.longitude);

                //Envoie la position au serveur
                if(socketFactory.isConnected) {
                    socketFactory.sendPosition(position.coords.latitude,  position.coords.longitude);
                }

                //Ajoute la position de l'utilisateur sur la map et centre la map
                var myLatLng = {lat: position.coords.latitude, lng: position.coords.longitude};
                marker.setPosition(myLatLng);
                map.setCenter(myLatLng);

                //Stock les coordonnées dans une var globale
                $scope.myLatLngGlobal = myLatLng;

                //Vérifie si l'utilisateur est dans une zone (si les zones sont disponibles)
                if(circlesData) {
                    checkIfIn(myLatLng);
                }
            },
            function (error) {
                console.log(error);
            });
        }
    }

    //============================================================================
    //======                      Communication                             ======
    //============================================================================

    /**
     * Ecoute le broadcast sur 'areas' et affiche les zones
     */
    $rootScope.$on('areas', function (event, data) {

        if(!areasDisplay) {
            console.log("Nombre d'areas : "+data.length);
            for(var i = 0; i < data.length; i++) {

                //Vérifie que les informations ne sont pas nulles
                if(data[i].radius && data[i].center) {
                    //console.log(parseFloat(data[i].radius), parseFloat(data[i].center.latitude), parseFloat(data[i].center.longitude));
                    addCircleFunc(parseFloat(data[i].radius), parseFloat(data[i].center.latitude), parseFloat(data[i].center.longitude));
                }
            }
            //Stock les données des zones dans une variables globales pour les afficher à tout moment
            circlesData = data;

            //Vérifie sur l'utilisation n'est pas déjà dans une zone, si sa position est disponible
            if($scope.myLatLngGlobal) {
                checkIfIn($scope.myLatLngGlobal);
            }

            areasDisplay = true;
        }
    });

    /**
     * Récupère les informations du formulaire et les envoie au serveur
     */
     function sendAnswer() {
        //Text aera
        if($scope.answer) {
            console.log("Answer, text area : "+$scope.answer);
        }
        //File (photo)
        var file = document.forms['form']['photoAnswer'].files[0];
        if(file) {
            console.log("Answer, file : "+file); //TODO réussir à récupérer la photo ?
            console.log(window.URL.createObjectURL(file));
        }

        if($scope.answer || file) {
            //Envoie au serveur la réponse
            socketFactory.sendAnswer($scope.answer, file);
            $scope.answer = "";

            $('#enigmaModal').modal('hide');
            $scope.loadingEnigmaAnswer = true;
            $('#enigmaModal-answer').modal('show');

            $scope.noAnswer = "";
        } else {
            $scope.noAnswer = "Veuillez compléter au moins un champ"
        }
    }

    /**
     * Vérifie la réponse de l'enigme
     */
    $rootScope.$on('response-enigma', function (event, data) {
        $scope.reponseEnigma = data;

        $scope.$apply();
        if(data == 'ok') {
            console.log("Bonne réponse");
            $('#indice').hide();
        } else {
            console.log("Mauvaise réponse");
        }
    });

    /**
     * Demande un indice
     */
     function askClue() {
        socketFactory.askClue();
    }

    /**
     * Réception d'une enigme
     */
    $rootScope.$on('enigme', function (event, data) {

        $('#modalButton').css("display", "block");
        $scope.enigma.title = data.name;
        $scope.enigma.text = data.enigma;
        $scope.enigma.photo = data.image;

        $scope.$apply();
    });

    /**
     * Réception d'un indice
     */
    $rootScope.$on('responseClue', function (event, data) {

        $scope.responseClue = data;
        $('#indice').show();
    });

    //============================================================================
    //======                         Calculs                                ======
    //============================================================================

    /**
     * Calcul de la distance entre 2 coordonnées en km
     * @param lat_a
     * @param lon_a
     * @param lat_b
     * @param lon_b
     * @returns {number}
     */
     function getDistance(lat_a, lon_a, lat_b, lon_b)  {
        var a = Math.PI / 180;
        var lat1 = lat_a * a;
        var lat2 = lat_b * a;
        var lon1 = lon_a * a;
        var lon2 = lon_b * a;
        var t1 = Math.sin(lat1) * Math.sin(lat2);
        var t2 = Math.cos(lat1) * Math.cos(lat2);
        var t3 = Math.cos(lon1 - lon2);
        var t4 = t2 * t3;
        var t5 = t1 + t4;
        var rad_dist = Math.atan(-t5/Math.sqrt(-t5 * t5 +1)) + 2 * Math.atan(1);

        return (rad_dist * 3437.74677 * 1.1508) * 1.6093470878864446;
    }

    /**
     * Vérifie pour toutes les zones si l'utilisateur est dans l'une d'elles
     * @param myLatLng
     */
     function checkIfIn(myLatLng) {
        for(var i = 0; i < circlesData.length; i++) {

            //Vérifie que les informations ne sont pas nulles
            if(circlesData[i].radius && circlesData[i].center) {

                //Calcul la distance
                var distance = getDistance(myLatLng.lat, myLatLng.lng, parseFloat(circlesData[i].center.latitude), parseFloat(circlesData[i].center.longitude));

                //Vérifie si l'utilisateur est dans la zone
                if (distance < ( parseFloat(circlesData[i].radius) / 1000)) {
                    console.log("Vous etes dans la zone");

                    //Lance l'enigme
                    socketFactory.getEnigme(circlesData[i]._id);
                }
            }
        }
    }


    //============================================================================
    //======                        Affichage                               ======
    //============================================================================

    /**
     * Permet d'afficher l'image de l'enigme en plein écran
     */
     $('#Fullscreen').css('height', $(document).outerWidth() + 'px');
     $('#img-enigma').click(function () {
        var src = $(this).attr('src'); //get the source attribute of the clicked image
        $('#Fullscreen img').attr('src', src); //assign it to the tag for your fullscreen div
        $('#Fullscreen').fadeIn();
    });
     $('#Fullscreen').click(function () {
        $(this).fadeOut(); //this will hide the fullscreen div if you click away from the image.
    });


    /**
     * Effacer bonne ou mauvaise réponse
     */
    function onCloseModal() {

        if($scope.loadingEnigmaAnswer && $scope.reponseEnigma != "") {
            $scope.loadingEnigmaAnswer = false;
        }

        //Delai pour éviter une animation de chargement furtive à la fermeture
        if(!$scope.loadingEnigmaAnswer) {
            setTimeout(function () {
                $scope.reponseEnigma = "";
            }, 500);
        }
    }

    function openEnigma() {
        if(!$scope.loadingEnigmaAnswer) {
            $('#enigmaModal').modal('show');
        } else {
            $('#enigmaModal-answer').modal('show');
        }
    }
});




