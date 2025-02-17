/*!
 * ATCF Parser <https://github.com/r-hurricane/atcf-parser>
 *
 * NOTE: This is not an official NHC/JTWC library.
 *
 * Parses an ATCF text file into a JavaScript object.
 * Documentation on the ATCF format can be found here:
 * https://science.nrlmry.navy.mil/atcf/docs/database/new/abdeck.txt
 *
 * Copyright (c) 2025, Tyler Hadidon (Beach-Brews)
 * Released under the MIT License.
 */

export const parseAtcf = (atcfText: string): AtcfFile =>
    new AtcfFile(atcfText);

export class AtcfFile {

    public readonly data: AtcfData[] = [];
    public readonly genNo: number | null = null;
    public readonly invest: IAtcfFromTo | null = null;
    public readonly transitioned: IAtcfFromTo | null = null;
    public readonly dissipated: IAtcfFromTo | null = null;

    public constructor(atcfText: string) {

        // Split into lines
        const lines = atcfText.trim().split(/\r?\n/);

        // Then process each line
        for (let l of lines) {
            const data = new AtcfData(l);
            this.data.unshift(data);

            // Copy up latest user defined fields (i.e. invest number) since you would need to loop to get them
            if (data.genNo) this.genNo = data.genNo;
            if (data.invest) this.invest = data.invest;
            if (data.transitioned) this.transitioned = data.transitioned;
            if (data.dissipated) this.dissipated = data.dissipated;
        }
    }

    public toJSON(): object {
        return {
            'data': this.data,
            'genNo': this.genNo,
            'invest': this.invest,
            'trans': this.transitioned,
            'diss': this.dissipated
        };
    }

}

export interface IAtcfRad {
    rad: number | null,
    code: string | null,
    ne: number | null,
    se: number | null,
    sw: number | null,
    nw: number | null,
}

export interface IAtcfStormCode {
    ba: string | null,
    id: string | null,
    yr: string | null
}

export interface IAtcfFromTo {
    from: IAtcfStormCode | null,
    to: IAtcfStormCode | null
}

export class AtcfData {

    public readonly basin: string | null = null;
    public readonly stormNo: number | null = null;
    public readonly date: Date | null = null;
    public readonly techNum: string | null = null;
    public readonly tech: string | null = null;
    public readonly tau: number | null = null;
    public readonly lat: number | null = null;
    public readonly lon: number | null = null;
    public readonly maxSusWind: number | null = null;
    public readonly minSeaLevelPsur: number | null = null;
    public readonly level: string | null = null;
    public readonly windRad: IAtcfRad | null = null;
    public readonly outerPsur: number | null = null;
    public readonly outerRad: number | null = null;
    public readonly maxWindRad: number | null = null;
    public readonly windGust: number | null = null;
    public readonly eyeDia: number | null = null;
    public readonly subRegion: string | null = null;
    public readonly maxSeas: number | null = null;
    public readonly forecaster: string | null = null;
    public readonly dir: number | null = null;
    public readonly speed: number | null = null;
    public readonly name: string | null = null;
    public readonly depth: string | null = null;
    public readonly seaRad: IAtcfRad | null = null;
    public readonly userData: {[key: string]: string} = {};

    public genNo: number | null = null;
    public invest: IAtcfFromTo | null = null;
    public transitioned: IAtcfFromTo | null = null;
    public dissipated: IAtcfFromTo | null = null;

    public constructor(line: string) {

        // Documentation https://science.nrlmry.navy.mil/atcf/docs/database/new/abdeck.txt
        // AL,    02, 2024062812,            , BEST,   0,    89N,   394W,   30, 1007, DB,
        // AL,    02, 2024062818,            , BEST,   0,    90N,   410W,   30, 1007, TD,
        // AL,    02, 2024062900,            , BEST,   0,    92N,   427W,   35, 1006, TS,
        // ==============================================================================
        // BASIN, CY, YYYYMMDDHH, TECHNUM/MIN, TECH, TAU, LatN/S, LonE/W, VMAX, MSLP, TY,
        // 0      1   2           3            4     5    6       7       8     9     10
        const l = line.split(/\s*,\s*/);

        // 0 - BASIN - basin, e.g. WP, IO, SH, CP, EP, AL, LS
        this.basin = l[0] ?? null;

        // 1 - CY - annual cyclone number: 1 - 99
        this.stormNo = this.asInt(l[1]);

        // 2 - YYYYMMDDHH - Warning Date-Time-Group, yyyymmddhh: 0000010100 through 9999123123.
        const d = l[2]?.match(/(\d{4})(\d{2})(\d{2})(\d{2})/);
        if (d) {
            this.date = new Date(`${d[1]}-${d[2]}-${d[3]}T${d[4]}:00:00Z`);
        }

        // 3 - TECHNUM/MIN - objective technique sorting number, minutes for best track: 00 - 99
        this.techNum = l[3] ?? null;

        // 4 - TECH - acronym for each objective technique or CARQ or WRNG, BEST for best track, up to 4 chars.
        this.tech = l[4] ?? null;

        // 5 - TAU - forecast period: -24 through 240 hours, 0 for best-track, negative taus used for CARQ and WRNG records.
        this.tau = this.asInt(l[5]);

        // 6 - LatN/S - Latitude for the DTG: 0 - 900 tenths of degrees, N/S is the hemispheric index.
        // 7 - LonE/W - Longitude for the DTG: 0 - 1800 tenths of degrees, E/W is the hemispheric index.
        const lat = l[6] ?? '0N';
        const lon = l[7] ?? '0E';
        this.lat = parseInt(lat.substring(0, lat.length-1))/10.0 * (lat[lat.length-1] === 'N' ? 1 : -1);
        this.lon = parseInt(lon.substring(0, lon.length-1))/10.0 * (lon[lon.length-1] === 'E' ? 1 : -1);

        // 8 - VMAX - Maximum sustained wind speed in knots: 0 - 300 kts.
        this.maxSusWind = this.asInt(l[8]);

        // 9 - MSLP - Minimum sea level pressure, 850 - 1050 mb.
        this.minSeaLevelPsur = this.asInt(l[9]);

        // 10 - TY - Highest level of tc development:
        this.level = this.getLevel(l[10]);

        //   0,         ,    0,    0,    0,    0,   1012,    150,  50,    40,   0,
        //   0,         ,    0,    0,    0,    0,   1011,    150,  50,    40,   0,
        //  34,      NEQ,   40,    0,    0,   40,   1011,    150,  40,    45,   0,
        // =======================================================================
        // RAD, WINDCODE, RAD1, RAD2, RAD3, RAD4, POUTER, ROUTER, RMW, GUSTS, EYE,
        // 11   12        13    14    15    16    17      18      19   20     21
        
        this.windRad = {
            // 11 - RAD - Wind intensity for the radii defined in this record: 34, 50 or 64 kt.
            rad: this.asInt(l[11]),
            // 12 - WINDCODE - Radius code: AAA - full circle || NEQ - quadrants
            code: l[12] ?? null,
            // 13 - RAD1 - If full circle, radius of specified wind intensity.
            // If WINDCODE="NEQ", then radius of RAD in NE Quadrant.  0 - 999 n mi. Set to "  0" if not defined.
            ne: this.asInt(l[13]),
            // 14 - RAD2 - If full circle, not used. Set to "  0"
            // If WINDCODE="NEQ", then radius of RAD in SE Quadrant.  0 - 999 n mi. Set to "  0" if not defined.
            se: this.asInt(l[14]),
            // 15 - RAD3 - If full circle, not used. Set to "  0"
            // If WINDCODE="NEQ", then radius of RAD in SW Quadrant.  0 - 999 n mi. Set to "  0" if not defined.
            sw: this.asInt(l[15]),
            // 16 - RAD4 - If full circle, not used. Set to "  0"
            // If WINDCODE="NEQ", then radius of RAD in NW Quadrant.  0 - 999 n mi. Set to "  0" if not defined.
            nw: this.asInt(l[16])
        };

        // 17 - POUTER - pressure in millibars of the last closed isobar, 900 - 1050 mb.
        this.outerPsur = this.asInt(l[17]);

        // 18 - ROUTER - radius of the last closed isobar, 0 - 999 n mi.
        this.outerRad = this.asInt(l[18]);

        // 19 - RMW - radius of max winds, 0 - 999 n mi.
        this.maxWindRad = this.asInt(l[19]);

        // 20 - GUSTS - gusts, 0 - 999 kt.
        this.windGust = this.asInt(l[20]);

        // 21 - EYE - eye diameter, 0 - 120 n mi.
        this.eyeDia = this.asInt(l[21]);

        //         L,       0,         ,   0,     0,     INVEST,    S,
        //         L,       0,         ,   0,     0,        TWO,    S,
        //         L,       0,         ,   0,     0,      BERYL,    M,
        // ===========================================================
        // SUBREGION, MAXSEAS, INITIALS, DIR, SPEED, STORMNAME, DEPTH,
        // 22         23       24        25   26     27         28

        // 22 - SUBREGION - subregion code: W,A,B,S,P,C,E,L,Q.
        this.subRegion = this.getSubRegion(l[22]);
        
        // 23 - MAXSEAS - max seas: 0 - 999 ft.
        this.maxSeas = this.asInt(l[23]);

        // 24 - INITIALS - Forecaster's initials used for tau 0 WRNG or OFCL, up to 3 chars.
        this.forecaster = l[24] ?? null;

        // 25 - DIR - storm direction, 0 - 359 degrees.
        this.dir = this.asInt(l[25]);

        // 26 - SPEED - storm speed, 0 - 999 kts.
        this.speed = this.asInt(l[26]);

        // 27 - STORMNAME - literal storm name, number, NONAME or INVEST,
        // or TCcyx where: cy = Annual cyclone number 01 - 99 x  = Subregion code: W,A,B,S,P,C,E,L,Q.
        this.name = l[27] ?? null;

        // 28 - DEPTH - system depth, D - deep, M - medium, S - shallow, X - unknown
        this.depth = this.getDepth(l[28]);

        //    0,         ,    0,      0,     0,     0, genesis-num, 008,
        //    0,         ,    0,      0,     0,     0, genesis-num, 008, TRANSITIONED, alA52024 to al022024,
        //    0,         ,    0,      0,     0,     0, genesis-num, 008,
        // =================================================================
        // SEAS, SEASCODE, SEAS1, SEAS2, SEAS3, SEAS4, USERDEFINED, userdata
        // 29    30        31     32     33     34     35+         36+

        this.seaRad = {
            // 29 - SEAS - Wave height for radii defined in SEAS1 - SEAS4, 0 - 99 ft.
            rad: this.asInt(l[29]),
            // 30 - SEASCODE - Radius code: AAA - full circle || NEQ, SEQ, SWQ, NWQ - quadrant
            code: l[30] ?? null,
            // 31 - SEAS1 - first quadrant seas radius as defined by SEASCODE,  0 - 999 n mi.
            ne: this.asInt(l[31]),
            // 32 - SEAS2 - second quadrant seas radius as defined by SEASCODE, 0 - 999 n mi.
            se: this.asInt(l[32]),
            // 33 - SEAS3 - third quadrant seas radius as defined by SEASCODE,  0 - 999 n mi.
            sw: this.asInt(l[33]),
            // 34 - SEAS4 - fourth quadrant seas radius as defined by SEASCODE, 0 - 999 n mi.
            nw: this.asInt(l[34])
        };

        // 35-43 odd  - USERDEFINE1-5 - 1 to 20 character description of user data to follow.
        // 36-44 even - userdata1-5 - user data section as indicated by USERDEFINED parameter (up to 100 char).
        // userdata   - user data section as indicated by USERDEFINED parameter.
        this.processUser(l[35], l[36]);
        this.processUser(l[37], l[38]);
        this.processUser(l[39], l[40]);
        this.processUser(l[41], l[42]);
        this.processUser(l[43], l[44]);
    }

    private asInt(strVal: string | undefined): number | null {
        return strVal ? parseInt(strVal) : null;
    }
    
    private getLevel(str: string | undefined): string | null {
        // 10 - TY - Highest level of tc development:
        switch (str?.toUpperCase()) {
            case "DB": return "disturbance";
            case "TD": return "tropical depression";
            case "TS": return "tropical storm";
            case "TY": return "typhoon,";
            case "ST": return "super typhoon";
            case "TC": return "tropical cyclone";
            case "HU": return "hurricane";
            case "SD": return "subtropical depression";
            case "SS": return "subtropical storm";
            case "EX": return "extratropical system";
            case "PT": return "post tropical";
            case "IN": return "inland";
            case "DS": return "dissipating";
            case "LO": return "low";
            case "WV": return "tropical wave";
            case "ET": return "extrapolated";
            case "MD": return "monsoon depression";
            case "XX": return "unknown";
            default: return str ?? null;
        }
    }

    private getSubRegion(str: string | undefined): string | null {
        // 22 - SUBREGION - subregion code: W,A,B,S,P,C,E,L,Q.
        switch (str?.toUpperCase()) {
            case "A": return "Arabian Sea";
            case "B": return "Bay of Bengal";
            case "C": return "Central Pacific";
            case "E": return "Eastern Pacific";
            case "L": return "Atlantic";
            case "P": return "South Pacific (135E - 120W)";
            case "Q": return "South Atlantic";
            case "S": return "South IO (20E - 135E)";
            case "W": return "Western Pacific";
            default: return str ?? null;
        }
    }

    private getDepth(str: string | undefined): string | null {
        // 28 - DEPTH - system depth, D - deep, M - medium, S - shallow, X - unknown
        switch (str?.toUpperCase()) {
            case "D": return "Deep";
            case "M": return "Medium";
            case "S": return "Shallow";
            case "X": return "Unknown";
            default: return str ?? null;
        }
    }

    private processUser(name: string | undefined, val: string | undefined) {
        if (!name || !val) return;

        // Match value To and From
        const tf = val.match(/(..)(..)(....)\s+(?:to\s+)?(..)(..)(....)/);

        // Examples of USERDEFINED/userdata pairs:
        // - An invest spawned from a genesis area: SPAWNINVEST, wp712015 to wp902015
        if (name === 'SPAWNINVEST' && tf) {
            this.invest = this.genToFrom(tf);
            return;
        }

        // - An invest area transitioning to a TC: TRANSITIONED, shE92015 to sh152015
        if (name === 'TRANSITIONED' && tf) {
            this.transitioned = this.genToFrom(tf);
            return;
        }

        // - A TC dissipated to an invest area: DISSIPATED, sh162015 sh982015
        if (name === 'DISSIPATED' && tf) {
            this.dissipated = this.genToFrom(tf);
            return;
        }

        // - A genesis area number: genesis-num, 001
        if (name === 'genesis-num') {
            this.genNo = parseInt(val);
            return;
        }

        // Unknown user data
        this.userData[name] = val;
    }

    private genToFrom(tf: RegExpMatchArray): IAtcfFromTo {
        return {
            from: {
                ba: tf[1] ?? null,
                id: tf[2] ?? null,
                yr: tf[3] ?? null
            },
            to: {
                ba: tf[4] ?? null,
                id: tf[5] ?? null,
                yr: tf[6] ?? null
            }
        }
    }

    public toJSON(): object {
        return {
            'basin': this.basin,
            'stormNo': this.stormNo,
            'date': this.date,
            'techNum': this.techNum,
            'tech': this.tech,
            'tau': this.tau,
            'lat': this.lat,
            'lon': this.lon,
            'maxSusWind': this.maxSusWind,
            'minSeaLevelPsur': this.minSeaLevelPsur,
            'level': this.level,
            'windRad': this.windRad,
            'outerPsur': this.outerPsur,
            'outerRad': this.outerRad,
            'maxWindRad': this.maxWindRad,
            'windGust': this.windGust,
            'eyeDia': this.eyeDia,
            'subRegion': this.subRegion,
            'maxSeas': this.maxSeas,
            'forecaster': this.forecaster,
            'dir': this.dir,
            'speed': this.speed,
            'name': this.name,
            'depth': this.depth,
            'seaRad': this.seaRad,
            'userData': this.userData,
            'genNo': this.genNo,
            'invest': this.invest,
            'trans': this.transitioned,
            'diss': this.dissipated
        }
    }

}