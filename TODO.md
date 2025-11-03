DB:

1. Upload stops.txt content to db - DONE!

Client:

1. Input for region with dropdown and submit btn.
   should give user input suggestions - DONE
   Should have dropdown with all estonian municipalities (from db with get request); - DONE
   Request: regions str - DONE
   Response: stop_obj[] of bus stops in specified region (show response in bus stop dropdown) - DONE

2. Input for bus stop in selected region with dropdown and submit btn
   should give user input suggestions - DONE
   Disabled before region is not selected - DONE
   Request: bus stop name - DONE
   Response: bus_obj[] (sort low-high, show bus as btn) - DONE

3. Clear input fields btn - DONE

4. Bus buttons: - DONE
   on bus btn click:
   Request: quickest arrival of bus for given bus name and stop name - DONE
   Responce: list of 5 quickest bus arrivals (show and sort by date) - DONE

Show schedule in UI - DONE

on app start:
automaticaly get user location - DONE!
find nearest region and station - DONE!
output nearest region and station in results - DONE!

FIX:

- FIX on page reload if region is selected dropdown doesn't work
- Make seamless UI/UX regarding form submission

TODO:
Make frontend styled
Change architecture (MVC, MVVM???)
maybe make mobile version of UI
