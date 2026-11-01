# Local artwork and globe texture

v1.3 observation artwork: bean seedling, snail, natural rock and blue hatchback were generated separately with the built-in image_gen tool; a separate three-frame sunflower seedling strip illustrates gradual phototropic growth. Runtime assets are local alpha WebP exports. Full prompts are in `docs/observation-image-prompts.json`. A left-light experiment mirrors the plant illustrations; it resets the comparison, rather than claiming an already-grown stem instantly straightens. These images contain no written answers or classification badges.

Partner poses were generated with the built-in image_gen tool on 2026-11-01. Twelve partner IDs each have ten different pose images; five additional semantic states reuse those images. Jax (`gen`) was prioritized at the user's explicit request. Production WebP exports retain alpha and are 320×320. Original PNGs, prompts and pose manifest are in the separate `resources/erin-acceptance-20261101` branch under `review/2026-11-01/erin-partner-assets-20261101.zip`.

Earth texture: **Land ocean ice 2048.jpg**, NASA Goddard Space Flight Center; Reto Stöckli, Robert Simmon, MODIS teams and contributing data providers. Downloaded locally from https://upload.wikimedia.org/wikipedia/commons/c/cd/Land_ocean_ice_2048.jpg . File description and attribution: https://commons.wikimedia.org/wiki/File:Land_ocean_ice_2048.jpg . Used under **CC BY-SA 3.0**, https://creativecommons.org/licenses/by-sa/3.0/ . Original texture is retained; displayed on an orthographic sphere with computed illumination. The texture and derived rendered globe images are offered under the same license. NASA context: https://science.nasa.gov/earth/earth-observatory/the-blue-marble-2181/ . No runtime network request is made to these sites.

The globe illustrates light direction and rotation. It is not a weather map, astronomical ephemeris or seasonal simulator. Its Sun distance and sizes are not to scale. Changing the model light direction must not be described as the real Sun orbiting Earth once per day.

City representative points (rounded to two decimals, not legal boundaries or addresses): Guangzhou 23.13°N 113.28°E, UNGEGN / China Institute of Toponymy, https://ungegn.un.org/dashboard/cities/details?id=2049 ; Beijing 39.91°N 116.40°E, https://www.geonames.org/1816670/beijing.html ; Shanghai 31.22°N 121.46°E, https://www.geonames.org/1796236/shanghai.html ; Wellington 41.29°S 174.78°E, https://www.geonames.org/2179537/wellington.html . GeoNames data attribution: GeoNames, CC BY 4.0, https://www.geonames.org/export/ . City labels use local data, never browser geolocation.

Eastern/Western Hemisphere labels follow the textbook 20°W / 160°E convention. East longitude is not synonymous with Eastern Hemisphere. Starter roster is explicitly reset once to Shadow (`ling`), Eggy (`gu`) and Kirby (`kirby`) at the user's request; learning evidence and previous partner reward ledger remain intact.


## v1.5.0

黑色蛋仔10张动作依据用户提供参考逐张生成；61张历史插画加入不同角色搭配与互动动作，均使用内置图片生成工具制作，非官方素材。幻参考仓库此前造型；角色名称与设计属于相应作品。素材、参考及逐图提示见 V1_5_RELEASE.md 和 history-art-v1.5-plan.json。历史题目依据不变。
