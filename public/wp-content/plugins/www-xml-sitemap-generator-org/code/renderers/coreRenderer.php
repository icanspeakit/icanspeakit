<?php

namespace xmlSitemapGenerator;

	interface iSitemapRenderer
	{
		public function renderIndex($page);
		public function renderPages($urls);
	}

	class sitemapRenderer 
	{
		
		static function getInstance($type)
		{
			$file = $type . 'Renderer.php';
			if (@include_once($file))
			{
				$class = '\\xmlSitemapGenerator\\' . $type . 'Renderer';
				return new $class();				
			}
			else
			{
				echo 'XML Sitemap Generator Error. <br />Invalid Renderer type specified : ' . $type;
				exit;
			}
		}

	}
	
	class rendererCore 
	{
		public static function renderComment()
		{
			echo "<!-- Created using XmlSitemapGenerator.org WordPress Plugin - Free HTML, RSS and XML sitemap generator -->";
		}
		
	}
	

?>