<?php

namespace xmlSitemapGenerator;

	
	class rssRenderer  extends rendererCore implements iSitemapRenderer
	{
		
		function renderItem( $url, $isIndex)
		{
			
			 echo '<item>'  ;
				echo '<guid>'  . htmlspecialchars($url->location) . '</guid>';
				echo '<title>'  . $url->title . '</title>';
				echo '<link>'  . htmlspecialchars($url->location) . '</link>';
				echo '<description>' . $url->description . '</description>';
				
			if(!$isIndex)
			{
				echo '<pubDate>' . date(DATE_RSS, $url->modified) . '</pubDate>';
			}

			 echo "</item>\n" ;
		}

		function renderIndex($urls)
		{
			$this->doRender($urls, true);
		}
		
		function renderPages($urls)
		{
			$this->doRender($urls, false);
		}
		
		function doRender($urls,$isIndex){
			
			$urlXls  = xsgPluginPath(). '/assets/SitemapRSS.xsl';
			
			
		  	ob_get_clean();
		 	ob_start();
			header('Content-Type: text/xml; charset=utf-8');
			
			echo '<?xml version="1.0" encoding="UTF-8" ?>';
			echo  "\n";
			echo '<?xml-stylesheet type="text/xsl" href="' . $urlXls  . '"?>';
			echo  "\n";
			
			$this->renderComment();
			echo  "\n";
			echo  '<rss version="2.0">';
			echo  "\n";
			echo  '<channel>';
			echo  "\n";

											
			echo '<title>'  . get_option('blogname') . '</title>';
			echo '<link>'  . get_bloginfo( 'url' ) . '</link>';
			echo '<description>' . get_option( 'blogdescription'). '</description>';
			

			
			echo  "\n";
			if (isset($urls))
			{
				foreach( $urls as $url ) 
				{
					
					$this->renderItem($url, $isIndex);
				}	
			}
			echo  "\n";
			echo '</channel>';
			echo  "\n";
			echo '</rss>';
			echo  "\n";
			$this->renderComment();
			echo  "\n";
			ob_end_flush();
						
		}
		
		
	}
	
	
	
?>