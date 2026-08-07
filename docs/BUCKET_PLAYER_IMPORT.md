# Bucket player import

Open a team's Buckets page, select **Upload Players** on the target bucket, then choose an `.xlsx` or `.csv` file up to 5 MB. The first worksheet is used for Excel files. The source file is processed in the browser and is not stored.

Required headers are `Name` and `Player Role`. Optional headers are `Availability`, `Matches`, `Batting Score`, `Bowling Wickets`, and `Catches`. Controlled aliases such as `Player Name`, `Role`, `Matches Played`, `Runs`, `Wickets`, and `Catch` are accepted case-insensitively.

Blank, malformed, non-numeric, or negative statistic values become `0`. Positive decimals are truncated toward zero, so `12.7` becomes `12`. Missing or unclear availability becomes `unknown`.

Sample CSV:

```csv
Name,Availability,Player Role,Matches,Batting Score,Bowling Wickets,Catches
Ravi Kumar,Full League,All-rounder,15,420,18,7
Arun Patel,Partial,Batter,10,350,0,5
Sai Kumar,,Fast Bowler,abc,-50,22,
John Smith,Unknown,Wicketkeeper,-2,N/A,,3
```

Expected statistics are respectively `15/420/18/7`, `10/350/0/5`, `0/0/22/0`, and `0/0/0/3`.

Duplicates use normalized names (trimmed, collapsed spaces, case-insensitive). **Skip** makes no change. **Update Existing** updates only availability, role, imported statistics, and bucket assignment. **Import Anyway** creates another record after explicit confirmation.
