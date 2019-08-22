## Midi Fiddling 

Fiddling with SVG animations, web midi, and web audio

#### Setup

1) In the repo, run ```python -m SimpleHTTPServer 9999```

2) Navigate to ```localhost:9999``` 

3) Use the keys to play sounds! 

3.1) navigate to ```localhost:9999?voice=true``` for a different sound (and non fixed length playing)

#### Instructions 

Play notes by using the keys, or you can attach a midi controller to the browser. Make sure to refresh browser once connecting the midi controller

Click anywhere to change the amount of curve

#### TODOS:

* Add option to change tone for the user

* Add option to change the curve amount for the user 

* Make the lines bezier functions vary in a dynamic way 
  * triggered by midi controller velocity 
  * trigger based on the number of notes being played 

* Change bezier functions to adapt to points that are very close (avoid strange turns)

* Make it work on mobile! (this could be a rabbit hole, requires mobile debugging)
