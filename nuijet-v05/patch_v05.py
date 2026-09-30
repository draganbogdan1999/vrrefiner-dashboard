from pathlib import Path
import re

p = Path("NuiJetBot/app/src/main/java/com/nuijet/bot/CaptureService.java")
s = p.read_text()

s = s.replace("float minX = 0.10f * CAP_W;", "float minX = 0.20f * CAP_W;")
s = s.replace("float maxX = 0.90f * CAP_W;", "float maxX = 0.80f * CAP_W;")

needle = "double currentRisk = riskAtX(laneX, risk, virtualPlayerX);"
repl = """double currentRisk = riskAtX(laneX, risk, virtualPlayerX);
        final float homeX = CAP_W / 2f;
        double centerRisk = riskAtX(laneX, risk, homeX);"""
s = s.replace(needle, repl, 1)

needle = """        if (!Float.isNaN(targetX) && Math.abs(targetX - virtualPlayerX) <= TARGET_DEADBAND) {
            targetX = Float.NaN;
            tapsThisDodge = 0;
        }
"""
repl = needle + """
        if (Float.isNaN(targetX)
                && currentRisk < dangerThreshold * 0.60
                && centerRisk < dangerThreshold * 0.72
                && Math.abs(virtualPlayerX - homeX) > 20f) {
            targetX = homeX;
            tapsThisDodge = 0;
        }
"""
s = s.replace(needle, repl, 1)

s = re.sub(
    r'    private int chooseSafeLane\(float\[\] laneX, double\[\] risk, float currentX\) \{.*?\n    \}\n\n    private double riskAtX',
    '''    private int chooseSafeLane(float[] laneX, double[] risk, float currentX) {
        int best = -1;
        double bestScore = Double.MAX_VALUE;
        float centre = CAP_W / 2f;

        for (int i = 0; i < laneX.length; i++) {
            float x = laneX[i];
            if (x < CAP_W * 0.20f || x > CAP_W * 0.80f) continue;

            if (currentX < centre - 20f && x > centre + 24f) continue;
            if (currentX > centre + 20f && x < centre - 24f) continue;

            double movementPenalty = 0.060 * Math.abs(x - currentX);
            double centrePenalty = 0.028 * Math.abs(x - centre);
            double score = risk[i] + movementPenalty + centrePenalty;

            if (score < bestScore) {
                bestScore = score;
                best = i;
            }
        }

        if (best >= 0) return best;

        int centreBest = 0;
        double centreDist = Double.MAX_VALUE;
        for (int i = 0; i < laneX.length; i++) {
            double d = Math.abs(laneX[i] - centre);
            if (d < centreDist) {
                centreDist = d;
                centreBest = i;
            }
        }
        return centreBest;
    }

    private double riskAtX''',
    s,
    flags=re.S
)

s = s.replace(
    '''else if (sec < 52.0) { phase = 3; phaseFactor = 1.85; }
        else { phase = 4; phaseFactor = 2.15; }''',
    '''else if (sec < 50.0) { phase = 3; phaseFactor = 1.75; }
        else if (sec < 72.0) { phase = 4; phaseFactor = 2.05; }
        else { phase = 5; phaseFactor = 2.25 + Math.min(0.20, (sec - 72.0) / 150.0); }'''
)
s = s.replace("2.45) : 1.0;", "2.55) : 1.0;")
s = s.replace("clamp(speedFactor, 1.0, 2.45);", "clamp(speedFactor, 1.0, 2.55);")

p.write_text(s)

g = Path("NuiJetBot/app/build.gradle")
t = g.read_text().replace("versionCode 4", "versionCode 5").replace('versionName "0.4"', 'versionName "0.5"')
g.write_text(t)

m = Path("NuiJetBot/app/src/main/java/com/nuijet/bot/MainActivity.java")
u = m.read_text().replace("Nui Jet Bot v0.4", "Nui Jet Bot v0.5")
m.write_text(u)
